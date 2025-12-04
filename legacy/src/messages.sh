#! /bin/bash

# TEXT FORMATTING CODES
RED_FG="31m"
YELLOW_FG="33m"
GREEN_FG="32m"
BOLD="1m"

###
# function prettify()
# prints a prettified message with colorized text
# @param $1 message
# @param $2 color_code
###
function prettify() {
	echo -e "\033[$2$1\033[0m"
}

###
# function success()
# prints a success message
# @param $1 message
###
function success() {
	prettify "✓ $1" $GREEN_FG
}

###
# function warning()
# prints a warning message
# @param $1 message
###
function warning() {
	prettify "⚠ $1" $YELLOW_FG
}

###
# function error()
# prints a error message
# @param $1 message
###
function error() {
	prettify "✗ $1" $RED_FG
}

###
# function step()
# prints a common process step message
# @param $1 message
###
function step() {
	prettify "➜ $1" $BOLD
}