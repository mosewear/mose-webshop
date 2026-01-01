// Debug logging helper that sends logs to server
export async function debugLog(level: 'info' | 'warn' | 'error', message: string, details?: any) {
  try {
    // Log to console as well
    console.log(`[${level.toUpperCase()}] ${message}`, details)

    // Send to server
    await fetch('/api/debug-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        details: details || {},
      }),
    })
  } catch (error) {
    console.error('Failed to send debug log:', error)
  }
}

