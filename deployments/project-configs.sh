#!/usr/bin/env bash

# List of git id name thing of the projects configured for autodeploy
configured_projects="Website-NIAEFEUP tts-fe nijobs-fe nijobs-be"

# Configuration of each project's port and env file location
# Uses bash dictionaries: https://devhints.io/bash#dictionaries

# The dictionary keys must be in the format "${project_github_id}---${branch}" (see examples below)
# The dotenv location is not mandatory, but if given it must exist.

declare -A project_port
declare -A project_dotenv_location

# Website-NIAEFEUP
project_port[Website-NIAEFEUP---master]=3000
project_dotenv_location[Website-NIAEFEUP---master]='/home/ni/niployments/deployments/env-files/Website-NIAEFEUP/master/.env'
project_port[Website-NIAEFEUP---develop]=3001
project_dotenv_location[Website-NIAEFEUP---develop]='/home/ni/niployments/deployments/env-files/Website-NIAEFEUP/develop/.env'

# tts
project_port[tts-fe---master]=3100
project_dotenv_location[tts-fe---master]='/home/ni/niployments/deployments/env-files/nijobs-be/master/.env'

# (Thanks to this modular config, it is possible to also deploy staging (painlessly!))
# nijobs-fe
project_port[nijobs-fe---master]=4001
project_dotenv_location[nijobs-fe---master]='/home/ni/niployments/deployments/env-files/nijobs-fe/master/.env'
## nijobs-fe staging
project_port[nijobs-fe---develop]=4002
project_dotenv_location[nijobs-fe---develop]='/home/ni/niployments/deployments/env-files/nijobs-fe/develop/.env'
## nijobs-fe experimental (pre-develop, "true staging" vs staging=beta/nightly)
project_port[nijobs-fe---experimental]=4003
project_dotenv_location[nijobs-fe---experimental]='/home/ni/niployments/deployments/env-files/nijobs-fe/experimental/.env'

# nijobs-be
project_port[nijobs-be---master]=4010
project_dotenv_location[nijobs-be---master]='/home/ni/niployments/deployments/env-files/nijobs-be/master/.env.local'
## nijobs-be staging
project_port[nijobs-be---develop]=4011
project_dotenv_location[nijobs-be---develop]='/home/ni/niployments/deployments/env-files/nijobs-be/develop/.env.local'
# debug example:
# project_dotenv_location[nijobs-be---develop]='/home/miguel/Coding/NIAEFEUP/niployments/deployments/env-files/nijobs-be/develop/.env.local'

# Essential, duh! :)
export project_port
export project_dotenv_location
export configured_projects
