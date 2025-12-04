#! /bin/bash

function do_clean() {
	step "Cleaning up..."

	ssh -p $3 -i $4 $2@$1 "rm -rf /tmp/$DIR_NAME"

	if [ $? -ne 0 ]; then
		error "Error cleaning up."
		exit 1
	else
		success "Successfully cleaned up."
	fi
}