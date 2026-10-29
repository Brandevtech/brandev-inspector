' Brandev Sidecar - Silent Launcher
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "S:\DEVELOPER\OPENCODE"

' Start sidecar silently (0 = hide window, False = don't wait for return)
WshShell.Run "cmd /c node sidecar.js", 0, False
