#!/bin/bash

#!/bin/bash

# Define the directory to search
directory="$(dirname $0)/services"
search_string="<FILL-IN>"

# Perform the recursive search
output=$(grep -rl "$search_string" "$directory")

# Check if any files contain the search string
if [ -n "$output" ]; then
    echo "Error: The following files are not filled in:"
    echo "$output"
else
    echo "Congrats! You may now try to deploy the cluster!"
fi
