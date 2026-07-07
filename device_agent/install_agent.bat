@echo off
echo Installing LD-AI Device Agent...

REM Create directory if not exists
if not exist "C:\LD-AI" mkdir "C:\LD-AI"

REM Copy executable
copy /Y "device_agent.exe" "C:\LD-AI\device_agent.exe"

REM Option to replace Shell (Kiosk Mode)
REM This makes the device boot directly into this agent, showing only the command line (no Desktop/Explorer).
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v Shell /t REG_SZ /d "C:\LD-AI\device_agent.exe" /f

REM If you prefer standard auto-start (keep Desktop), use this instead:
REM reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "LDAIJuxinSuanli" /t REG_SZ /d "C:\LD-AI\device_agent.exe" /f

echo.
echo Installation Complete!
echo The agent will start automatically on login.
echo You can also start it manually from C:\LD-AI\device_agent.exe
echo.
pause
