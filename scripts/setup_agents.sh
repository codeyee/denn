#!/bin/bash
set -e

# Source directory for skills
SKILLS_ROOT=".agents/skills"

# Full list of available agent directories
# Format: "directory"
AVAILABLE_AGENTS=(
    ".adal/skills"
    ".agent/skills"
    ".augment/skills"
    ".claude/skills"
    ".cline/skills"
    ".codebuddy/skills"
    ".commandcode/skills"
    ".continue/skills"
    ".crush/skills"
    ".cursor/skills"
    ".factory/skills"       # Droid
    ".goose/skills"
    ".iflow/skills"
    ".junie/skills"
    ".kilocode/skills"
    ".kiro/skills"
    ".kode/skills"
    ".mcpjam/skills"
    ".mux/skills"
    ".neovate/skills"
    ".openhands/skills"
    ".pi/skills"
    ".pochi/skills"
    ".qoder/skills"
    ".qwen/skills"
    ".roo/skills"
    ".trae/skills"
    ".vibe/skills"          # Mistral Vibe
    ".windsurf/skills"
    ".zencoder/skills"
)

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -a, --agent <name>   Specify an agent to configure (e.g., 'cursor', 'claude')."
    echo "                       Can be repeated for multiple agents."
    echo "                       Matches partial names (e.g., 'cursor' matches '.cursor/skills')."
    echo "  --all                Configure ALL available agents."
    echo "  -h, --help           Show this help message."
    echo ""
    echo "Examples:"
    echo "  $0 --agent cursor"
    echo "  $0 -a claude -a windsurf"
    echo "  $0 --all"
    exit 1
}

# Parse arguments
TARGET_AGENTS=()
ALL_FLAG=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -a|--agent)
            if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
                TARGET_AGENTS+=("$2")
                shift
            else
                echo "Error: Argument for --agent is missing" >&2
                exit 1
            fi
            ;;
        --all)
            ALL_FLAG=true
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown parameter passed: $1"
            usage
            ;;
    esac
    shift
done

# Validate selection
if [ "$ALL_FLAG" = false ] && [ ${#TARGET_AGENTS[@]} -eq 0 ]; then
    echo "Error: No agents specified."
    usage
fi

# Determine final list of directories to process
PROCESS_DIRS=()

if [ "$ALL_FLAG" = true ]; then
    PROCESS_DIRS=("${AVAILABLE_AGENTS[@]}")
else
    # Filter available agents based on user input
    for input_name in "${TARGET_AGENTS[@]}"; do
        found=false
        for available_dir in "${AVAILABLE_AGENTS[@]}"; do
            # Check if input name matches the directory (simple substring check)
            # e.g. "cursor" matches ".cursor/skills"
            if [[ "$available_dir" == *"$input_name"* ]]; then
                PROCESS_DIRS+=("$available_dir")
                found=true
            fi
        done
        
        if [ "$found" = false ]; then
            echo "Warning: No matching agent directory found for '$input_name'"
        fi
    done
fi

# Remove duplicates if any (e.g. if user matches same dir twice)
# Bash array generic duplicate removal
eval PROCESS_DIRS=($(printf "%s\n" "${PROCESS_DIRS[@]}" | sort -u))

if [ ${#PROCESS_DIRS[@]} -eq 0 ]; then
    echo "Error: No valid agent directories selected to process."
    exit 1
fi

echo "Setting up agent environment for: ${PROCESS_DIRS[*]}"

# 1. Generate CLAUDE.md from AGENTS.md
if [ -f "AGENTS.md" ]; then
    echo "Copying AGENTS.md to CLAUDE.md..."
    cp AGENTS.md CLAUDE.md
else
    echo "Warning: AGENTS.md not found, skipping CLAUDE.md generation."
fi

# 2. Iterate over all skills in the source directory
if [ -d "$SKILLS_ROOT" ]; then
    for skill_path in "$SKILLS_ROOT"/*; do
        if [ -d "$skill_path" ]; then
            skill_name=$(basename "$skill_path")
            echo "Processing skill: $skill_name"
            
            for dir in "${PROCESS_DIRS[@]}"; do
                target_path="$dir/$skill_name"
                
                # Create destination directory parent
                mkdir -p "$dir"
                
                # Remove existing symlink or directory
                if [ -d "$target_path" ] || [ -L "$target_path" ]; then
                     rm -rf "$target_path"
                fi

                # Determine relative path from target directory back to root
                # "skills" -> ".."
                # ".agent/skills" -> "../.."
                
                if [[ "$dir" == "skills" ]]; then
                    rel_prefix=".."
                else
                    rel_prefix="../.."
                fi
                
                # Create the symlink
                ln -s "$rel_prefix/$skill_path" "$target_path"
                # echo "  Symlinked to $target_path"
            done
        fi
    done
    echo "  -> Linked to selected agents."
else
    echo "Error: Skills root directory $SKILLS_ROOT not found!"
    exit 1
fi

echo "Agent environment setup complete."
