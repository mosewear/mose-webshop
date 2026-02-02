#!/bin/bash

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJza2xjZ2V5dmRzeGp4dm1naGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNzk5MywiZXhwIjoyMDgyNjgzOTkzfQ.voHo-a_gi6dt-Ha6jFtYVXxZgR8qoR-uYGr4029O0g0"

echo "🔍 Monitoring admin_push_subscriptions..."
echo "📱 Enable nu KaChing op je telefoon!"
echo ""

COUNT=0
while [ $COUNT -lt 60 ]; do
  RESULT=$(curl -s "https://bsklcgeyvdsxjxvmghbp.supabase.co/rest/v1/admin_push_subscriptions?select=user_id,endpoint,created_at,updated_at" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY")
  
  NUM_SUBS=$(echo $RESULT | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
  
  TIMESTAMP=$(date "+%H:%M:%S")
  
  if [ "$NUM_SUBS" -gt "0" ]; then
    echo ""
    echo "✅ [$TIMESTAMP] SUCCESS! Subscription gevonden!"
    echo ""
    echo $RESULT | python3 -m json.tool
    exit 0
  else
    echo "⏳ [$TIMESTAMP] Nog geen subscription... (check $((COUNT+1))/60)"
  fi
  
  sleep 2
  COUNT=$((COUNT+1))
done

echo ""
echo "❌ Timeout na 2 minuten - geen subscription gevonden"
