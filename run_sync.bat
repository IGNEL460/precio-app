@echo off
cd /d "E:\precio"
echo [ %date% %time% ] Iniciando Sincronizacion Automatica... >> sync_log.txt
node scripts/sync.js >> sync_log.txt 2>&1
echo [ %date% %time% ] Sincronizacion Finalizada. >> sync_log.txt
echo ------------------------------------------ >> sync_log.txt
