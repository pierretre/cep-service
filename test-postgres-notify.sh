#!/bin/bash

# Test script for PostgreSQL LISTEN/NOTIFY
# This script tests the real-time rule synchronization

set -e

API_URL="http://localhost:8081/api/rules"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PostgreSQL LISTEN/NOTIFY Test        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if API is running
echo -e "${BLUE}[1/6] Checking if API is running...${NC}"
if curl -s -f "$API_URL" > /dev/null; then
    echo -e "${GREEN}✓ API is running${NC}"
else
    echo -e "${RED}✗ API is not running. Start it first!${NC}"
    exit 1
fi

# Create a rule
echo -e "\n${BLUE}[2/6] Creating a test rule...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "notify-test-rule",
    "eplQuery": "select * from Event(value > 100)",
    "description": "Test rule for LISTEN/NOTIFY"
  }')

RULE_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$RULE_ID" ]; then
    echo -e "${GREEN}✓ Rule created with ID: $RULE_ID${NC}"
    echo -e "${GREEN}  Check engine logs - should see NOTIFY immediately!${NC}"
else
    echo -e "${RED}✗ Failed to create rule${NC}"
    exit 1
fi

# Wait a moment
echo -e "\n${BLUE}[3/6] Waiting 2 seconds...${NC}"
sleep 2

# Update the rule
echo -e "\n${BLUE}[4/6] Updating the rule...${NC}"
curl -s -X PUT "$API_URL/$RULE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "notify-test-rule",
    "eplQuery": "select * from Event(value > 150)",
    "description": "Updated threshold",
    "active": true
  }' > /dev/null

echo -e "${GREEN}✓ Rule updated${NC}"
echo -e "${GREEN}  Check engine logs - should see UPDATE notification!${NC}"

# Wait a moment
echo -e "\n${BLUE}[5/6] Waiting 2 seconds...${NC}"
sleep 2

# Deactivate the rule
echo -e "\n${BLUE}[6/6] Deactivating the rule...${NC}"
curl -s -X PATCH "$API_URL/$RULE_ID/deactivate" > /dev/null

echo -e "${GREEN}✓ Rule deactivated${NC}"
echo -e "${GREEN}  Check engine logs - should see rule undeployed!${NC}"

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Complete!                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Expected engine logs:${NC}"
echo -e "  [NOTIFY] Channel: rule_changes, Payload: INSERT:$RULE_ID:notify-test-rule"
echo -e "  ✓ Deployed rule: notify-test-rule"
echo -e ""
echo -e "  [NOTIFY] Channel: rule_changes, Payload: UPDATE:$RULE_ID:notify-test-rule"
echo -e "  Redeploying updated rule: notify-test-rule"
echo -e "  ✓ Undeployed rule: notify-test-rule"
echo -e "  ✓ Deployed rule: notify-test-rule"
echo -e ""
echo -e "  [NOTIFY] Channel: rule_changes, Payload: UPDATE:$RULE_ID:notify-test-rule"
echo -e "  ✓ Undeployed rule: notify-test-rule"
echo ""
echo -e "${BLUE}If you see these logs, LISTEN/NOTIFY is working!${NC}"
echo -e "${BLUE}If you see a 5-second delay, you're using polling mode.${NC}"
echo ""

# Cleanup
echo -e "${BLUE}Cleaning up...${NC}"
curl -s -X DELETE "$API_URL/$RULE_ID" > /dev/null
echo -e "${GREEN}✓ Test rule deleted${NC}"
