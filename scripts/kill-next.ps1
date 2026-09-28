# Matikan proses node.exe yang menjalankan Next.js (server zombie pengunci DLL Prisma)
# Aman: tidak menyentuh node.exe lain (editor, tooling, dll.)
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'next' } |
  ForEach-Object {
    $cmd = $_.CommandLine
    if ($cmd.Length -gt 90) { $cmd = $cmd.Substring(0, 90) }
    Write-Host ("KILL " + $_.ProcessId + " : " + $cmd)
    Stop-Process -Id $_.ProcessId -Force
  }
Write-Host "---selesai---"
