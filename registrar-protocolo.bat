@echo off
title Registrar Protocolo Brandev Sidecar
echo Registrando protocolo brandev-sidecar:// no Windows...

reg add "HKCU\Software\Classes\brandev-sidecar" /ve /t REG_SZ /d "URL:Brandev Sidecar Protocol" /f
reg add "HKCU\Software\Classes\brandev-sidecar" /v "URL Protocol" /t REG_SZ /d "" /f
reg add "HKCU\Software\Classes\brandev-sidecar\shell\open\command" /ve /t REG_SZ /d "wscript.exe \"%~dp0launcher.vbs\" \"%%1\"" /f

echo.
echo ===================================================
echo Protocolo registrado com sucesso!
echo Agora o botao no popup da extensao pode iniciar o Sidecar.
echo ===================================================
pause
