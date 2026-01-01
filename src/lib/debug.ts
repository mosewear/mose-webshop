// Debug logging helper that sends logs to server
export async function debugLog(level: 'info' | 'warn' | 'error', message: string, details?: any) {
  try {
    // Log to console as well
    console.log(`[${level.toUpperCase()}] ${message}`, details)

    // Send to server (don't await - fire and forget so errors don't block)
    fetch('/api/debug-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        details: details || {},
      }),
    }).catch(err => {
      console.error('Failed to send debug log:', err)
    })
  } catch (error) {
    console.error('Failed to send debug log:', error)
  }
}

