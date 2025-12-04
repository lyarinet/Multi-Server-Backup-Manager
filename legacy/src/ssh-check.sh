#! /bin/bash

function check_connectivity() {
	step "Checking SSH connectivity..."
	if [ ! $1 ]; then
		error "No IP address/hostname given".
		exit 1
	fi

	if [ ! $2 ]; then
		$2=22
	fi

	ssh -p $2 -o ConnectTimeout=5 -i $4 $3@$1 exit
	
	if [ $? -eq 0 ]; then
		success "$1 is up."
		return 0
	else
		error "Could not connect to $1"
		error $SSH_MSG
		return 1
	fi
}