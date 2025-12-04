#! /bin/bash
function create_backup_dir() {
	step "Creating backup directory ($DIR_NAME) on $1"
	ssh  -p $3 -i $4 $2@$1 "mkdir -p /tmp/$DIR_NAME"

	if [ $? -ne 0 ]; then
		error "Error creating directory."
		exit 1
	else
		success "Successfully created directory."
	fi
}

function compress_www_dir() {
	step "Compressing www directory..."

	ssh  -p $3 -i $4 $2@$1 "tar -cvzf /tmp/$DIR_NAME/www_bak.tar.gz /var/www" >> /dev/null 2>&1 

	if [ $? -ne 0 ]; then
		error "Compressing www directory failed."
		exit 1
	else
		success "Compressing www directory succeeded."
	fi
}

function compress_logs_dir() {
	step "Compressing logs directory..."

	ssh  -p $3 -i $4 $2@$1 "tar -cvzf /tmp/$DIR_NAME/logs_bak.tar.gz /var/log" >> /dev/null 2>&1

	if [ $? -ne 0 ]; then
		error "Compressing logs directory failed."
		exit 1
	else
		success "Compressing logs directory succeeded."
	fi
}

function compress_nginx_conf_dir() {
	step "Compressing nginx conf directory..."

	ssh  -p $3 -i $4 $2@$1 "tar -cvzf /tmp/$DIR_NAME/nginx_bak.tar.gz /etc/nginx" >> /dev/null 2>&1

	if [ $? -ne 0 ]; then
		error "Compressing nginx conf directory failed."
		exit 1
	else
		success "Compressing nginx conf directory succeeded."
	fi
}