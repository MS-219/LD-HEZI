package main

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
)

// Config
const (
	// 尝试这两个地址
	HeartbeatURL_HTTPS     = "https://hz.shandongliandong.com/api/device/heartbeat"
	HeartbeatURL_HTTP      = "http://hz.shandongliandong.com/api/device/heartbeat"
	CommandSubmitURL_HTTPS = "https://hz.shandongliandong.com/api/edge/commands/submit"
	CommandSubmitURL_HTTP  = "http://hz.shandongliandong.com/api/edge/commands/submit"
)

// Global variables
var (
	deviceSN  = "JX-UNKNOWN"
	bindCode  = ""
	deviceIP  = "0.0.0.0"
	isOnline  = false
	logBuffer []string
	lastErr   = "" // 用于显示在屏幕上的错误信息
)

type HeartbeatResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		PendingCommand     string `json:"pendingCommand"`
		PendingCommandNo   string `json:"pendingCommandNo"`
		PendingCommandType string `json:"pendingCommandType"`
	} `json:"data"`
}

func main() {
	// 1. Init info
	deviceSN = getDeviceSN()
	deviceIP = getLocalIP()
	bindCode = generateBindCode(deviceSN)

	// 2. Heartbeat thread
	go func() {
		for {
			err := sendHeartbeat()
			if err != nil {
				isOnline = false
				lastErr = err.Error()
			} else {
				isOnline = true
				lastErr = "CONNECTED"
			}
			time.Sleep(60 * time.Second) // 每分钟发送一次心跳，节省带宽
		}
	}()

	// 3. Fast log/Matrix effect
	go func() {
		tasks := []string{"BLOCK", "HASH ", "SYNC ", "NODE ", "CALC ", "SIG  "}
		for {
			task := tasks[int(time.Now().UnixNano())%len(tasks)]
			logStr := fmt.Sprintf("[%s] %s 0x%X -> %s STATUS: OK",
				time.Now().Format("15:04:05"),
				task,
				(time.Now().UnixNano())&0xFFFFFFFF,
				strings.ReplaceAll(deviceSN[3:11], "-", ""))
			addLog(logStr)
			time.Sleep(250 * time.Millisecond)
		}
	}()

	// 4. Main UI loop
	for {
		drawUI()
		time.Sleep(100 * time.Millisecond)
	}
}

func getPersistPath() string {
	if os.PathSeparator == '/' {
		return "/etc/ld-ai-sn" // Linux
	}
	return "C:\\LD-AI\\sn.txt" // Windows
}

func getDeviceSN() string {
	path := getPersistPath()

	// 1. 尝试从本地持久化文件读取 (如果已经生成过，就锁死)
	if data, err := os.ReadFile(path); err == nil {
		sn := strings.TrimSpace(string(data))
		if sn != "" {
			return sn
		}
	}

	// 2. 如果没生成过，则进行“组合生成”
	var components []string

	// A. 获取主板 UUID
	if data, err := os.ReadFile("/sys/class/dmi/id/product_uuid"); err == nil {
		id := strings.TrimSpace(string(data))
		if id != "" && id != "not specified" && !strings.HasPrefix(id, "0000") {
			components = append(components, id)
		}
	}

	// B. 获取物理网卡 MAC
	interfaces, err := net.Interfaces()
	if err == nil {
		for _, inter := range interfaces {
			if inter.HardwareAddr != nil && inter.Name != "lo" && !strings.Contains(inter.Name, "veth") {
				components = append(components, inter.HardwareAddr.String())
				break // 只取第一个有效的
			}
		}
	}

	// C. 生成最终 SN
	var finalSN string
	if len(components) > 0 {
		// 使用 MD5 混合 UUID 和 MAC 地址，确保唯一性
		seed := strings.Join(components, "|")
		hash := md5.Sum([]byte(seed))
		finalSN = "JX-" + strings.ToUpper(hex.EncodeToString(hash[:])[:12])
	} else {
		// 万一啥都读不到，用时间戳兜底
		finalSN = "JX-R-" + time.Now().Format("0102150405")
	}

	// 3. 将生成的 SN 存入本地文件，永久锁定
	// 确保目录存在 (针对 Windows)
	if os.PathSeparator == '\\' {
		os.MkdirAll("C:\\LD-AI", 0755)
	}
	_ = os.WriteFile(path, []byte(finalSN), 0644)

	return finalSN
}

func getLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "127.0.0.1"
	}
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return "127.0.0.1"
}

func addLog(msg string) {
	logBuffer = append(logBuffer, msg)
	if len(logBuffer) > 20 {
		logBuffer = logBuffer[1:]
	}
}

func generateBindCode(sn string) string {
	hash := md5.Sum([]byte(sn + "juxin_salt_2025"))
	hexStr := hex.EncodeToString(hash[:])
	return "JX" + strings.ToUpper(hexStr[:6])
}

func drawUI() {
	fmt.Print("\033[H\033[J")
	fmt.Println("\033[1;36m---------------------- HEZI NODE CONSOLE / V3.1 ----------------------\033[0m")
	fmt.Println()
	fmt.Println("\033[1;30mNODE IDENTITY\033[0m")
	fmt.Printf("  serial     \033[1;37m%s\033[0m\n", deviceSN)
	fmt.Printf("  pair key   \033[1;35m%s\033[0m\n", bindCode)
	fmt.Printf("  network    \033[1;34m%s\033[0m\n", deviceIP)

	statusStr := "\033[1;32mONLINE\033[0m"
	if !isOnline {
		statusStr = fmt.Sprintf("\033[1;31mOFFLINE\033[0m  %s", lastErr)
	}
	fmt.Println()
	fmt.Println("\033[1;30mCONTROL LINK\033[0m")
	fmt.Printf("  state      %s\n", statusStr)
	fmt.Println("  action     enter pair key in the client app")
	fmt.Println()
	fmt.Println("\033[1;30m--------------------------- EVENT STREAM ---------------------------\033[0m")
	for _, log := range logBuffer {
		fmt.Println("\033[1;32m  >\033[0m " + log)
	}
}

func sendHeartbeat() error {
	payload := fmt.Sprintf(`{"sn": "%s", "bindCode": "%s"}`, deviceSN, bindCode)

	var respBody []byte
	var err error

	// 1. 尝试 HTTPS
	respBody, err = doRequest(HeartbeatURL_HTTPS, payload)
	if err != nil {
		// 2. 如果 HTTPS 失败，尝试 HTTP
		respBody, err = doRequest(HeartbeatURL_HTTP, payload)
	}

	if err != nil {
		return err
	}

	// 解析响应中的指令
	var hbResp HeartbeatResponse
	if err := json.Unmarshal(respBody, &hbResp); err == nil {
		if hbResp.Data.PendingCommand != "" {
			cmdStr := hbResp.Data.PendingCommand
			commandNo := hbResp.Data.PendingCommandNo
			addLog("RECEIVED CMD: " + cmdStr)
			// 异步执行指令，避免阻塞心跳
			go func() {
				exitCode, output := runCommand(cmdStr)
				addLog(fmt.Sprintf("CMD DONE: code=%d", exitCode))
				if commandNo != "" {
					submitCommandResult(commandNo, exitCode, output)
				}
			}()
		}
	}

	return nil
}

func runCommand(cmdStr string) (int, string) {
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "sh", "-c", cmdStr)
	outputBytes, err := cmd.CombinedOutput()
	output := strings.TrimSpace(string(outputBytes))
	if ctx.Err() == context.DeadlineExceeded {
		return 124, trimOutput(output + "\nCommand timeout")
	}
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return exitErr.ExitCode(), trimOutput(output)
		}
		return 1, trimOutput(output + "\n" + err.Error())
	}
	return 0, trimOutput(output)
}

func trimOutput(output string) string {
	output = strings.TrimSpace(output)
	if len(output) > 4000 {
		return output[len(output)-4000:]
	}
	return output
}

func submitCommandResult(commandNo string, exitCode int, output string) {
	payloadBytes, _ := json.Marshal(map[string]interface{}{
		"sn":         deviceSN,
		"commandNo":  commandNo,
		"exitCode":   exitCode,
		"resultText": output,
	})
	payload := string(payloadBytes)
	if _, err := doRequest(CommandSubmitURL_HTTPS, payload); err != nil {
		if _, httpErr := doRequest(CommandSubmitURL_HTTP, payload); httpErr != nil {
			addLog("CMD RESULT SUBMIT FAILED: " + httpErr.Error())
			return
		}
	}
	addLog("CMD RESULT SUBMITTED: " + commandNo)
}

func doRequest(url, payload string) ([]byte, error) {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Post(url, "application/json", strings.NewReader(payload))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return body, nil
}
