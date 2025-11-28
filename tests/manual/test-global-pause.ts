// Test file to verify global pause mechanism
// This is a standalone test that can be run to verify the functionality

// Simulate the global state
declare global {
  var emailProgress: Map<string, {
    total: number
    sent: number
    failed: number
    status: 'sending' | 'completed' | 'error' | 'paused'
    startTime: number
    lastUpdate: number
  }>
  var emailRateLimitState: {
    isPaused: boolean
    pauseStartTime: number
    pauseDuration: number
    pauseReason?: string
  }
}

// Initialize global state
if (!global.emailProgress) {
  global.emailProgress = new Map()
}

if (!global.emailRateLimitState) {
  global.emailRateLimitState = {
    isPaused: false,
    pauseStartTime: 0,
    pauseDuration: 300000, // 5 minutes default pause
    pauseReason: undefined
  }
}

// Copy the functions from send-single-email route
function triggerGlobalPause(reason: string, durationMs: number = 300000) {
  console.log(`🚨 TRIGGERING GLOBAL EMAIL PAUSE: ${reason} for ${durationMs/1000}s`)
  global.emailRateLimitState.isPaused = true
  global.emailRateLimitState.pauseStartTime = Date.now()
  global.emailRateLimitState.pauseDuration = durationMs
  global.emailRateLimitState.pauseReason = reason
  
  // Mark all active campaigns as paused
  for (const [campaignId, progress] of global.emailProgress.entries()) {
    if (progress.status === 'sending') {
      progress.status = 'paused'
      progress.lastUpdate = Date.now()
      global.emailProgress.set(campaignId, progress)
    }
  }
}

function checkGlobalPause(): boolean {
  if (!global.emailRateLimitState.isPaused) {
    return false
  }
  
  const now = Date.now()
  const pauseEndTime = global.emailRateLimitState.pauseStartTime + global.emailRateLimitState.pauseDuration
  
  if (now >= pauseEndTime) {
    console.log(`✅ GLOBAL EMAIL PAUSE LIFTED after ${(now - global.emailRateLimitState.pauseStartTime)/1000}s`)
    global.emailRateLimitState.isPaused = false
    global.emailRateLimitState.pauseReason = undefined
    
    // Resume all paused campaigns
    for (const [campaignId, progress] of global.emailProgress.entries()) {
      if (progress.status === 'paused') {
        progress.status = 'sending'
        progress.lastUpdate = Date.now()
        global.emailProgress.set(campaignId, progress)
      }
    }
    return false
  }
  
  const remainingTime = pauseEndTime - now
  console.log(`⏸️ GLOBAL EMAIL PAUSE ACTIVE: ${global.emailRateLimitState.pauseReason} - ${Math.ceil(remainingTime/1000)}s remaining`)
  return true
}

// Test scenarios
function runTests() {
  console.log('=== Testing Global Pause Mechanism ===\n')
  
  // Test 1: Initial state
  console.log('Test 1: Initial state')
  console.log('Pause status:', checkGlobalPause())
  console.log('Global state:', global.emailRateLimitState)
  console.log('')
  
  // Test 2: Add some campaigns
  console.log('Test 2: Adding campaigns')
  global.emailProgress.set('campaign1', {
    total: 100,
    sent: 50,
    failed: 0,
    status: 'sending',
    startTime: Date.now(),
    lastUpdate: Date.now()
  })
  
  global.emailProgress.set('campaign2', {
    total: 200,
    sent: 100,
    failed: 5,
    status: 'sending',
    startTime: Date.now(),
    lastUpdate: Date.now()
  })
  
  console.log('Active campaigns:', Array.from(global.emailProgress.keys()))
  console.log('')
  
  // Test 3: Trigger global pause
  console.log('Test 3: Triggering global pause')
  triggerGlobalPause('Test rate limit hit', 10000) // 10 seconds for testing
  console.log('')
  
  // Test 4: Check pause status
  console.log('Test 4: Checking pause status')
  console.log('Is paused:', checkGlobalPause())
  console.log('Campaign statuses:')
  for (const [id, progress] of global.emailProgress.entries()) {
    console.log(`  ${id}: ${progress.status}`)
  }
  console.log('')
  
  // Test 5: Wait and check auto-resume (simulate)
  console.log('Test 5: Simulating pause expiration')
  // Manually expire the pause
  global.emailRateLimitState.pauseStartTime = Date.now() - 11000 // 11 seconds ago
  console.log('Is paused after expiration:', checkGlobalPause())
  console.log('Campaign statuses after resume:')
  for (const [id, progress] of global.emailProgress.entries()) {
    console.log(`  ${id}: ${progress.status}`)
  }
  console.log('')
  
  console.log('=== All tests completed ===')
}

// Export for potential use
export { triggerGlobalPause, checkGlobalPause, runTests }

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
}
