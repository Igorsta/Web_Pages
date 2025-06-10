#!/bin/bash

# Create or clear the output file
output="project_dump.txt"
> "$output"

# Save project structure (excluding common folders)
echo "===== PROJECT STRUCTURE =====" >> "$output"
tree -I '__pycache__|migrations|env|venv|*.pyc|media|static' >> "$output"

ignore=("node_modules")

find . -type f \( -name "*.py" -o -name "*.js" -o -name "*.css" -o -name "*.ts" -o -name "*.html" \) | while read -r file; do
    echo -e "\n\n===== File: $file =====" >> "$output"
    cat "$file" >> "$output"
done
