#!/bin/bash

# Create or clear the output file
output="project_dump.txt"
> "$output"

# Save project structure (excluding common folders)
echo "===== PROJECT STRUCTURE =====" >> "$output"
tree -I '__pycache__|migrations|env|venv|*.pyc|media|static' >> "$output"

# Save settings
echo -e "\n\n===== settings.py =====" >> "$output"
cat login_required_project/settings.py >> "$output"

# Save URLs
echo -e "\n\n===== project-level urls.py =====" >> "$output"
cat login_required_project/urls.py >> "$output"

echo -e "\n\n===== app-level urls.py =====" >> "$output"
cat main/urls.py >> "$output"

# Save models
echo -e "\n\n===== models.py =====" >> "$output"
cat main/models.py >> "$output"

# Save views
echo -e "\n\n===== views.py =====" >> "$output"
cat main/views.py >> "$output"

# Save forms
echo -e "\n\n===== forms.py =====" >> "$output"
cat main/forms.py >> "$output"

# Save templates
for f in main/templates/main/*.html; do
    echo -e "\n\n===== Template: $(basename "$f") =====" >> "$output"
    cat "$f" >> "$output"
done

# Save TypeScript files
find static -type f -name '*.ts' | while read -r f; do
    echo -e "\n\n===== TypeScript: $(basename "$f") =====" >> "$output"
    cat "$f" >> "$output"
done

# Save CSS files
find static -type f -name '*.css' | while read -r f; do
    echo -e "\n\n===== CSS: $(basename "$f") =====" >> "$output"
    cat "$f" >> "$output"
done

# Save JavaScript files
find static -type f -name '*.js' | while read -r f; do
    echo -e "\n\n===== JavaScript: $(basename "$f") =====" >> "$output"
    cat "$f" >> "$output"
done

# Optional: Add base.html if exists
echo -e "\n\n===== base.html (if exists) =====" >> "$output"
[ -f main/templates/base.html ] && cat main/templates/base.html >> "$output"
