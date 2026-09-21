#!/bin/bash

case "$1" in
  start)
    pm2 start ecosystem.config.cjs
    pm2 save
    ;;
  stop)
    pm2 stop discordhost
    pm2 save
    ;;
  restart)
    pm2 restart discordhost
    pm2 save
    ;;
  status)
    pm2 status
    ;;
  logs)
    pm2 logs discordhost --lines 50
    ;;
  *)
    echo "Usage: ./panel.sh {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
