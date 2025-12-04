#! /bin/bash

function db_dump() {
	step "Creating DB Dump of all tables..."
	ssh  -p $3 -i $4 $2@$1 "mysqldump --user root --password  --all-databases > /tmp/$DIR_NAME/db-dump-all.sql"

	if [ $? -ne 0 ]; then
		error "Error creating dump."
		exit 1
	else
		success "Successfully created dump."
	fi
}
