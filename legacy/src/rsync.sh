#! /bin/bash

function rsync_bak() {
	step "Rsyncing backup directory from $1/tmp/$DIRNAME to local..."
	mkdir -p ~/Server-Backups/$DIR_NAME && rsync -avz -e "ssh -p $3 -i $4" $2@$1:/tmp/$DIR_NAME ~/Server-Backups/ >> /dev/null 2>&1
	
	if [ $? -ne 0 ]; then
		error "Error rsyncing backup directory."
		exit 1
	else
		success "Successfully rsynced backup directory."
	fi
}