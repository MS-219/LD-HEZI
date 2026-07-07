package com.ldai.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.ldai.common.Result;
import com.ldai.entity.ApiMerchant;
import com.ldai.entity.DeviceCommand;
import com.ldai.entity.ProxyPool;
import com.ldai.entity.ProxyUsageLog;
import com.ldai.mapper.ProxyUsageLogMapper;
import com.ldai.service.IApiMerchantService;
import com.ldai.service.IDeviceCommandService;
import com.ldai.service.IProxyPoolService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/sl/proxy")
public class ProxyPoolController {

    @Autowired
    private IProxyPoolService proxyPoolService;

    @Autowired
    private IApiMerchantService apiMerchantService;

    @Autowired
    private ProxyUsageLogMapper proxyUsageLogMapper;

    @Autowired
    private IDeviceCommandService deviceCommandService;

    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.success(proxyPoolService.getPoolStats());
    }

    @PostMapping("/sync")
    public Result<Map<String, Object>> sync() {
        return Result.success(proxyPoolService.syncFromDevices());
    }

    @GetMapping("/list")
    public Result<IPage<ProxyPool>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String ip,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String carrier,
            @RequestParam(required = false) Integer status) {

        LambdaQueryWrapper<ProxyPool> wrapper = new LambdaQueryWrapper<>();
        if (ip != null && !ip.trim().isEmpty()) {
            wrapper.like(ProxyPool::getProxyIp, ip.trim());
        }
        if (province != null && !province.trim().isEmpty()) {
            wrapper.like(ProxyPool::getProvince, province.trim());
        }
        if (city != null && !city.trim().isEmpty()) {
            wrapper.like(ProxyPool::getCity, city.trim());
        }
        if (carrier != null && !carrier.trim().isEmpty()) {
            wrapper.eq(ProxyPool::getCarrier, carrier.trim());
        }
        if (status != null) {
            wrapper.eq(ProxyPool::getStatus, status);
        }
        wrapper.orderByDesc(ProxyPool::getStatus)
                .orderByDesc(ProxyPool::getDeviceCount)
                .orderByDesc(ProxyPool::getLastSyncTime);

        IPage<ProxyPool> result = proxyPoolService.page(new Page<>(page, size), wrapper);
        fillMerchantNames(result.getRecords());
        return Result.success(result);
    }

    @GetMapping("/locations")
    public Result<Map<String, Object>> locations() {
        List<ProxyPool> pools = proxyPoolService.list();
        Map<String, List<String>> provinceMap = pools.stream()
                .filter(pool -> pool.getProvince() != null && !pool.getProvince().isEmpty())
                .collect(Collectors.groupingBy(
                        ProxyPool::getProvince,
                        java.util.LinkedHashMap::new,
                        Collectors.mapping(ProxyPool::getCity, Collectors.toList())));

        Map<String, List<String>> cleanProvinceMap = new java.util.LinkedHashMap<>();
        for (Map.Entry<String, List<String>> entry : provinceMap.entrySet()) {
            List<String> cities = entry.getValue().stream()
                    .filter(city -> city != null && !city.isEmpty())
                    .distinct()
                    .sorted()
                    .collect(Collectors.toList());
            cleanProvinceMap.put(entry.getKey(), cities);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("provinces", cleanProvinceMap.keySet().stream().sorted().collect(Collectors.toList()));
        result.put("provinceMap", cleanProvinceMap);
        result.put("carriers", pools.stream()
                .map(ProxyPool::getCarrier)
                .filter(carrier -> carrier != null && !carrier.isEmpty())
                .distinct()
                .sorted()
                .collect(Collectors.toList()));
        return Result.success(result);
    }

    @GetMapping("/merchants")
    public Result<List<Map<String, Object>>> merchants() {
        List<Map<String, Object>> data = apiMerchantService.lambdaQuery()
                .eq(ApiMerchant::getStatus, 1)
                .orderByDesc(ApiMerchant::getCreateTime)
                .list()
                .stream()
                .map(merchant -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", merchant.getId());
                    item.put("merchantName", merchant.getMerchantName());
                    item.put("appId", merchant.getAppId());
                    return item;
                })
                .collect(Collectors.toList());
        return Result.success(data);
    }

    @PostMapping("/allocate")
    public Result<List<ProxyPool>> allocate(@RequestBody Map<String, Object> params) {
        Long merchantId = getLong(params, "merchantId");
        Integer durationMinutes = getInt(params, "durationMinutes", 1440);
        if (merchantId == null) {
            return Result.error("请选择商户");
        }

        Long proxyId = getLong(params, "proxyId");
        if (proxyId != null) {
            ProxyPool proxy = proxyPoolService.allocateProxy(proxyId, merchantId, durationMinutes);
            if (proxy == null) {
                return Result.error("代理不存在或当前不可分配");
            }
            List<ProxyPool> proxies = java.util.Collections.singletonList(proxy);
            return Result.success(proxies);
        }

        String province = getString(params, "province");
        String carrier = getString(params, "carrier");
        Integer count = getInt(params, "count", 1);
        List<ProxyPool> proxies = proxyPoolService.obtainProxies(
                province,
                carrier,
                count,
                merchantId,
                durationMinutes);
        return Result.success(proxies);
    }

    @PostMapping("/release")
    public Result<String> release(@RequestBody Map<String, Object> params) {
        Long proxyId = getLong(params, "proxyId");
        if (proxyId == null) {
            return Result.error("proxyId 不能为空");
        }
        return proxyPoolService.releaseProxy(proxyId)
                ? Result.success("释放成功")
                : Result.error("释放失败");
    }

    @PostMapping("/release-by-merchant")
    public Result<Integer> releaseByMerchant(@RequestBody Map<String, Object> params) {
        Long merchantId = getLong(params, "merchantId");
        if (merchantId == null) {
            return Result.error("merchantId 不能为空");
        }
        return Result.success(proxyPoolService.releaseByMerchant(merchantId));
    }

    @PostMapping("/status")
    public Result<String> updateStatus(@RequestBody Map<String, Object> params) {
        Long proxyId = getLong(params, "proxyId");
        Integer status = getInt(params, "status", null);
        if (proxyId == null || status == null) {
            return Result.error("proxyId 和 status 不能为空");
        }
        if (status == 2) {
            return Result.error("使用中状态请通过分配操作设置");
        }
        if (status < 0 || status > 3) {
            return Result.error("无效状态");
        }

        ProxyPool proxy = proxyPoolService.getById(proxyId);
        if (proxy == null) {
            return Result.error("代理不存在");
        }

        boolean success = proxyPoolService.lambdaUpdate()
                .eq(ProxyPool::getId, proxyId)
                .set(ProxyPool::getStatus, status)
                .set(ProxyPool::getAllocatedTo, null)
                .set(ProxyPool::getAllocatedAt, null)
                .set(ProxyPool::getExpireAt, null)
                .update();
        if (success) {
            writeAdminLog(proxy, status == 3 ? "maintenance" : "status", "后台更新状态为 " + status);
        }
        return success ? Result.success("更新成功") : Result.error("更新失败");
    }

    @PostMapping("/tunnel")
    public Result<String> updateTunnel(@RequestBody Map<String, Object> params) {
        Long proxyId = getLong(params, "proxyId");
        Integer proxyPort = getInt(params, "proxyPort", null);
        String protocol = getString(params, "protocol");
        if (proxyId == null) {
            return Result.error("proxyId 不能为空");
        }
        if (proxyPort == null || proxyPort < 0 || proxyPort > 65535) {
            return Result.error("代理端口无效");
        }
        if (protocol == null) {
            protocol = "socks5";
        }
        if (!"socks5".equals(protocol) && !"http".equals(protocol)) {
            return Result.error("协议仅支持 socks5/http");
        }

        ProxyPool proxy = proxyPoolService.getById(proxyId);
        if (proxy == null) {
            return Result.error("代理不存在");
        }
        boolean success = proxyPoolService.lambdaUpdate()
                .eq(ProxyPool::getId, proxyId)
                .set(ProxyPool::getProxyPort, proxyPort)
                .set(ProxyPool::getProtocol, protocol)
                .set(ProxyPool::getLastCheckTime, LocalDateTime.now())
                .update();
        if (success) {
            writeAdminLog(proxy, "tunnel", "后台更新隧道 " + protocol + ":" + proxyPort);
        }
        return success ? Result.success("更新成功") : Result.error("更新失败");
    }

    @PostMapping("/start-link")
    public Result<DeviceCommand> startLink(@RequestBody Map<String, Object> params) {
        Long proxyId = getLong(params, "proxyId");
        Integer localPort = getInt(params, "localPort", 1080);
        Integer remotePort = getInt(params, "remotePort", null);
        if (proxyId == null) {
            return Result.error("proxyId 不能为空");
        }
        if (localPort == null || localPort <= 0 || localPort > 65535) {
            return Result.error("本地代理端口无效");
        }

        ProxyPool proxy = proxyPoolService.getById(proxyId);
        if (proxy == null) {
            return Result.error("代理不存在");
        }
        if (proxy.getDeviceSn() == null || proxy.getDeviceSn().isEmpty()) {
            return Result.error("代理缺少代表设备");
        }
        if (remotePort == null) {
            remotePort = proxy.getProxyPort();
        }
        if (remotePort == null || remotePort <= 0 || remotePort > 65535) {
            return Result.error("请先配置中心映射端口");
        }

        String commandText = "/opt/ld-ai/proxy-control.sh restart " + localPort
                + " && /opt/ld-ai/tunnel-control.sh restart " + localPort + " " + remotePort;
        DeviceCommand command = deviceCommandService.dispatchCommand(
                proxy.getDeviceId(),
                proxy.getDeviceSn(),
                "OPEN_TUNNEL",
                commandText,
                "{\"localPort\":" + localPort + ",\"remotePort\":" + remotePort + "}",
                "代理链路启动 " + proxy.getProxyIp());
        if (command != null) {
            proxyPoolService.lambdaUpdate()
                    .eq(ProxyPool::getId, proxyId)
                    .set(ProxyPool::getProxyPort, remotePort)
                    .set(ProxyPool::getProtocol, proxy.getProtocol() == null ? "socks5" : proxy.getProtocol())
                    .set(ProxyPool::getLastCheckTime, LocalDateTime.now())
                    .update();
            writeAdminLog(proxy, "start_link", "下发代理链路启动指令 remotePort=" + remotePort);
        }
        return command == null ? Result.error("下发失败") : Result.success(command);
    }

    @PostMapping("/stop-link")
    public Result<DeviceCommand> stopLink(@RequestBody Map<String, Object> params) {
        Long proxyId = getLong(params, "proxyId");
        if (proxyId == null) {
            return Result.error("proxyId 不能为空");
        }

        ProxyPool proxy = proxyPoolService.getById(proxyId);
        if (proxy == null) {
            return Result.error("代理不存在");
        }
        if (proxy.getDeviceSn() == null || proxy.getDeviceSn().isEmpty()) {
            return Result.error("代理缺少代表设备");
        }

        String commandText = "/opt/ld-ai/tunnel-control.sh stop; /opt/ld-ai/proxy-control.sh stop";
        DeviceCommand command = deviceCommandService.dispatchCommand(
                proxy.getDeviceId(),
                proxy.getDeviceSn(),
                "CLOSE_TUNNEL",
                commandText,
                null,
                "代理链路停止 " + proxy.getProxyIp());
        if (command != null) {
            writeAdminLog(proxy, "stop_link", "下发代理链路停止指令");
        }
        return command == null ? Result.error("下发失败") : Result.success(command);
    }

    @GetMapping("/logs")
    public Result<IPage<ProxyUsageLog>> logs(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Long proxyId,
            @RequestParam(required = false) Long merchantId,
            @RequestParam(required = false) String action) {

        LambdaQueryWrapper<ProxyUsageLog> wrapper = new LambdaQueryWrapper<>();
        if (proxyId != null) {
            wrapper.eq(ProxyUsageLog::getProxyId, proxyId);
        }
        if (merchantId != null) {
            wrapper.eq(ProxyUsageLog::getMerchantId, merchantId);
        }
        if (action != null && !action.trim().isEmpty()) {
            wrapper.eq(ProxyUsageLog::getAction, action.trim());
        }
        wrapper.orderByDesc(ProxyUsageLog::getCreateTime);
        return Result.success(proxyUsageLogMapper.selectPage(new Page<>(page, size), wrapper));
    }

    private void fillMerchantNames(List<ProxyPool> proxies) {
        Set<Long> merchantIds = proxies.stream()
                .map(ProxyPool::getAllocatedTo)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (merchantIds.isEmpty()) {
            return;
        }
        Map<Long, String> merchantNameMap = apiMerchantService.listByIds(merchantIds).stream()
                .collect(Collectors.toMap(
                        ApiMerchant::getId,
                        merchant -> merchant.getMerchantName() == null ? "未命名商户" : merchant.getMerchantName(),
                        (a, b) -> a));
        for (ProxyPool proxy : proxies) {
            if (proxy.getAllocatedTo() != null) {
                proxy.setMerchantName(merchantNameMap.get(proxy.getAllocatedTo()));
            }
        }
    }

    private void writeAdminLog(ProxyPool proxy, String action, String remark) {
        ProxyUsageLog log = new ProxyUsageLog();
        log.setProxyId(proxy.getId());
        log.setProxyIp(proxy.getProxyIp());
        log.setMerchantId(proxy.getAllocatedTo());
        log.setMerchantName(proxy.getMerchantName());
        log.setAction(action);
        log.setBytesUp(0L);
        log.setBytesDown(0L);
        log.setRemark(remark);
        log.setCreateTime(LocalDateTime.now());
        proxyUsageLogMapper.insert(log);
    }

    private String getString(Map<String, Object> params, String key) {
        Object value = params.get(key);
        if (value == null || value.toString().trim().isEmpty()) {
            return null;
        }
        return value.toString().trim();
    }

    private Long getLong(Map<String, Object> params, String key) {
        Object value = params.get(key);
        if (value == null || value.toString().trim().isEmpty()) {
            return null;
        }
        return Long.valueOf(value.toString());
    }

    private Integer getInt(Map<String, Object> params, String key, Integer defaultValue) {
        Object value = params.get(key);
        if (value == null || value.toString().trim().isEmpty()) {
            return defaultValue;
        }
        return Integer.valueOf(value.toString());
    }
}
