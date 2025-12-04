#! /bin/bash
. "src/messages.sh"
. "src/ssh-check.sh"
. "src/compress.sh"
. "src/db-dump.sh"
. "src/rsync.sh"
. "src/clean.sh"

DIR_NAME="backup_$(date +%d-%m-%Y)"
IP="ip/hostname here"
USER="user here"
PORT="port here" 
SSH_KEY="ssh id file"

check_connectivity $IP $PORT $USER $SSH_KEY

if [ $? -ne 0 ]; then
	exit 1
fi

create_backup_dir $IP $USER $PORT $SSH_KEY
compress_www_dir $IP $USER $PORT $SSH_KEY
compress_logs_dir $IP $USER $PORT $SSH_KEY
compress_nginx_conf_dir $IP $USER $PORT $SSH_KEY
db_dump $IP $USER $PORT $SSH_KEY
rsync_bak $IP $USER $PORT $SSH_KEY
do_clean $IP $USER $PORT $SSH_KEY

success "Backup complete."