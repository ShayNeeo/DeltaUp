#!/bin/bash

# DeltaUp Log Management Utility
# This script helps manage, view, and analyze installation logs

LOG_DIR="/var/log/deltaup"
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Display help message
show_help() {
    cat << EOF
🔍 DeltaUp Log Management Tool

Usage: ./manage-logs.sh [COMMAND] [OPTIONS]

Commands:
    view              View the latest installation log
    view-errors       View error logs only
    list              List all installation logs
    tail              Follow the latest log file in real-time
    clean             Clean up old logs (older than $RETENTION_DAYS days)
    rotate            Rotate logs and compress old ones
    analyze           Analyze logs for errors and warnings
    status            Show log directory status
    export [FILE]     Export logs to a file for sharing
    help              Show this help message

Examples:
    ./manage-logs.sh view
    ./manage-logs.sh tail
    ./manage-logs.sh analyze
    ./manage-logs.sh clean
    ./manage-logs.sh export /tmp/deltaup-logs.tar.gz

EOF
}

# Check if log directory exists
check_log_dir() {
    if [ ! -d "$LOG_DIR" ]; then
        echo -e "${RED}❌ Log directory not found: $LOG_DIR${NC}"
        exit 1
    fi
}

# View latest log
view_latest_log() {
    check_log_dir
    local latest_log=$(ls -t "$LOG_DIR"/install-*.log 2>/dev/null | head -1)
    
    if [ -z "$latest_log" ]; then
        echo -e "${YELLOW}⚠️  No installation logs found${NC}"
        return 1
    fi
    
    echo -e "${BLUE}📋 Latest Log: $latest_log${NC}"
    echo "────────────────────────────────────────────────────────────────"
    cat "$latest_log"
}

# View error logs
view_error_logs() {
    check_log_dir
    
    if [ ! -f "$LOG_DIR/install-errors.log" ]; then
        echo -e "${GREEN}✓ No errors found in error log${NC}"
        return 0
    fi
    
    echo -e "${BLUE}📋 Error Log: $LOG_DIR/install-errors.log${NC}"
    echo "────────────────────────────────────────────────────────────────"
    cat "$LOG_DIR/install-errors.log"
}

# List all logs
list_logs() {
    check_log_dir
    
    echo -e "${BLUE}📁 Installation Logs:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    
    if ls "$LOG_DIR"/install-*.log 1> /dev/null 2>&1; then
        ls -lh "$LOG_DIR"/install-*.log | awk '{print $9, "(" $5 ")", $6, $7, $8}'
    else
        echo -e "${YELLOW}⚠️  No installation logs found${NC}"
    fi
    
    if [ -f "$LOG_DIR/install-errors.log" ]; then
        echo ""
        echo -e "${RED}❌ Errors Log:${NC}"
        wc -l "$LOG_DIR/install-errors.log" | awk '{print "   " $2 " (" $1 " lines)"}'
    fi
}

# Follow latest log in real-time
tail_latest_log() {
    check_log_dir
    local latest_log=$(ls -t "$LOG_DIR"/install-*.log 2>/dev/null | head -1)
    
    if [ -z "$latest_log" ]; then
        echo -e "${YELLOW}⚠️  No installation logs found${NC}"
        return 1
    fi
    
    echo -e "${BLUE}📡 Following: $latest_log (Press Ctrl+C to stop)${NC}"
    echo "────────────────────────────────────────────────────────────────"
    tail -f "$latest_log"
}

# Clean old logs
clean_logs() {
    check_log_dir
    
    echo -e "${BLUE}🧹 Cleaning logs older than $RETENTION_DAYS days...${NC}"
    
    local count=0
    while IFS= read -r file; do
        rm -f "$file"
        echo -e "  ${GREEN}✓${NC} Removed: $file"
        ((count++))
    done < <(find "$LOG_DIR" -name "install-*.log" -type f -mtime +$RETENTION_DAYS)
    
    if [ $count -eq 0 ]; then
        echo -e "${GREEN}✓ No old logs to remove${NC}"
    else
        echo -e "${GREEN}✓ Removed $count old log file(s)${NC}"
    fi
}

# Rotate and compress logs
rotate_logs() {
    check_log_dir
    
    echo -e "${BLUE}📦 Rotating logs...${NC}"
    
    # Create archive directory
    mkdir -p "$LOG_DIR/archive"
    
    local compressed=0
    local total=0
    
    for log_file in "$LOG_DIR"/install-*.log; do
        if [ -f "$log_file" ]; then
            ((total++))
            # Check if file is older than 7 days
            if [ $(find "$log_file" -type f -mtime +7) ]; then
                local base_name=$(basename "$log_file")
                gzip -c "$log_file" > "$LOG_DIR/archive/${base_name}.gz"
                echo -e "  ${GREEN}✓${NC} Compressed: $base_name"
                ((compressed++))
            fi
        fi
    done
    
    echo -e "${GREEN}✓ Rotation complete: $compressed/$total files compressed${NC}"
}

# Analyze logs for errors and warnings
analyze_logs() {
    check_log_dir
    
    echo -e "${BLUE}📊 Log Analysis Report${NC}"
    echo "────────────────────────────────────────────────────────────────"
    
    local latest_log=$(ls -t "$LOG_DIR"/install-*.log 2>/dev/null | head -1)
    
    if [ -z "$latest_log" ]; then
        echo -e "${YELLOW}⚠️  No installation logs found${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Analyzing: $latest_log${NC}"
    echo ""
    
    # Count different log levels (using proper number extraction)
    local info_count=$(grep -c "^\[INFO\]" "$latest_log" 2>/dev/null | tail -1 || echo 0)
    local success_count=$(grep -c "^\[✓\]" "$latest_log" 2>/dev/null | tail -1 || echo 0)
    local warning_count=$(grep -c "^\[!\]" "$latest_log" 2>/dev/null | tail -1 || echo 0)
    local error_count=$(grep -c "^\[✗\]" "$latest_log" 2>/dev/null | tail -1 || echo 0)
    local debug_count=$(grep -c "^\[DEBUG\]" "$latest_log" 2>/dev/null | tail -1 || echo 0)
    
    echo -e "${GREEN}✓ Success Messages:${NC}   $success_count"
    echo -e "${BLUE}ℹ Info Messages:${NC}     $info_count"
    echo -e "${YELLOW}! Warning Messages:${NC}   $warning_count"
    echo -e "${RED}✗ Error Messages:${NC}    $error_count"
    echo -e "  Debug Messages:      $debug_count"
    echo ""
    
    # Show actual errors if any
    if [ $error_count -gt 0 ]; then
        echo -e "${RED}❌ Errors Found:${NC}"
        grep "^\[✗\]" "$latest_log" | head -10
        if [ $error_count -gt 10 ]; then
            echo "   ... and $((error_count - 10)) more errors"
        fi
        echo ""
    fi
    
    # Show warnings if any
    if [ $warning_count -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Warnings Found:${NC}"
        grep "^\[!\]" "$latest_log" | head -5
        if [ $warning_count -gt 5 ]; then
            echo "   ... and $((warning_count - 5)) more warnings"
        fi
    fi
}

# Show log directory status
show_status() {
    check_log_dir
    
    echo -e "${BLUE}📊 Log Directory Status${NC}"
    echo "────────────────────────────────────────────────────────────────"
    
    local log_count=$(ls -1 "$LOG_DIR"/install-*.log 2>/dev/null | wc -l)
    local total_size=$(du -sh "$LOG_DIR" 2>/dev/null | awk '{print $1}')
    local latest_log=$(ls -t "$LOG_DIR"/install-*.log 2>/dev/null | head -1)
    local latest_time=""
    
    if [ -n "$latest_log" ]; then
        latest_time=$(stat -c %y "$latest_log" 2>/dev/null | cut -d' ' -f1,2)
    fi
    
    echo -e "Directory:            $LOG_DIR"
    echo -e "Total Size:           $total_size"
    echo -e "Installation Logs:    $log_count files"
    if [ -n "$latest_time" ]; then
        echo -e "Latest Log:           $latest_time"
    fi
    echo -e "Error Log:            $([ -f "$LOG_DIR/install-errors.log" ] && echo "Present" || echo "Not found")"
    echo ""
    
    # Show disk usage warning if necessary
    local usage=$(df "$LOG_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$usage" -gt 80 ]; then
        echo -e "${YELLOW}⚠️  Disk usage is at ${usage}% - consider running 'clean' command${NC}"
    else
        echo -e "${GREEN}✓ Disk usage: ${usage}%${NC}"
    fi
}

# Export logs
export_logs() {
    local export_file="${1:-.}"
    
    if [ "$export_file" == "." ]; then
        export_file="deltaup-logs-$(date +%Y%m%d-%H%M%S).tar.gz"
    fi
    
    check_log_dir
    
    echo -e "${BLUE}📦 Exporting logs to: $export_file${NC}"
    
    if tar -czf "$export_file" -C "$LOG_DIR" . 2>/dev/null; then
        local size=$(du -h "$export_file" | awk '{print $1}')
        echo -e "${GREEN}✓ Export successful: $export_file ($size)${NC}"
    else
        echo -e "${RED}❌ Export failed${NC}"
        return 1
    fi
}

# Main logic
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

case "$1" in
    view)
        view_latest_log
        ;;
    view-errors)
        view_error_logs
        ;;
    list)
        list_logs
        ;;
    tail)
        tail_latest_log
        ;;
    clean)
        clean_logs
        ;;
    rotate)
        rotate_logs
        ;;
    analyze)
        analyze_logs
        ;;
    status)
        show_status
        ;;
    export)
        export_logs "$2"
        ;;
    help)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac

