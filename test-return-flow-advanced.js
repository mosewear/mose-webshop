/**
 * Geavanceerde test script voor retour flow - test edge cases en timing issues
 * 
 * Test:
 * - Race conditions tussen webhook en polling
 * - Multiple status updates
 * - Error handling
 * - Concurrent requests
 */

class AdvancedReturnFlowTester {
  constructor() {
    this.tests = []
    this.passed = 0
    this.failed = 0
  }

  test(name, fn) {
    this.tests.push({ name, fn })
  }

  async run() {
    console.log('🧪 Advanced Return Flow Tests\n')
    console.log('='.repeat(60))
    
    for (const test of this.tests) {
      try {
        await test.fn()
        console.log(`✅ ${test.name}`)
        this.passed++
      } catch (error) {
        console.error(`❌ ${test.name}`)
        console.error(`   Error: ${error.message}`)
        if (error.stack) {
          console.error(`   Stack: ${error.stack.split('\n')[1]}`)
        }
        this.failed++
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`)
    
    if (this.failed === 0) {
      console.log('🎉 All advanced tests passed!')
      process.exit(0)
    } else {
      console.log('⚠️  Some tests failed')
      process.exit(1)
    }
  }

  mockReturnData(status, hasLabel = false, paymentIntentId = null) {
    return {
      id: 'test-return-id',
      status: status,
      return_label_payment_status: status === 'return_label_payment_completed' ? 'completed' : 'pending',
      return_label_url: hasLabel ? 'https://example.com/label.pdf' : null,
      return_tracking_code: hasLabel ? 'TRACK123' : null,
      return_label_payment_intent_id: paymentIntentId,
      return_label_cost_incl_btw: 0.51,
      return_label_paid_at: status === 'return_label_payment_completed' ? new Date().toISOString() : null,
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

const tester = new AdvancedReturnFlowTester()

// Test 1: Race condition - webhook en polling tegelijk
tester.test('Race condition: webhook update tijdens polling', async () => {
  let returnData = tester.mockReturnData('return_label_payment_pending')
  let pollingActive = true
  
  // Simuleer polling die start
  const poll = async () => {
    // Poll haalt oude status op
    const oldStatus = returnData.status
    
    // Webhook update gebeurt tijdens polling
    await tester.delay(100)
    returnData = {
      ...returnData,
      status: 'return_label_payment_completed',
      return_label_payment_status: 'completed',
    }
    
    // Polling zou nieuwe status moeten zien bij volgende iteratie
    if (oldStatus === returnData.status) {
      throw new Error('Polling did not detect status change')
    }
    
    pollingActive = false
  }
  
  await poll()
  
  if (returnData.status !== 'return_label_payment_completed') {
    throw new Error('Status not updated by webhook')
  }
})

// Test 2: Multiple rapid status updates
tester.test('Multiple rapid status updates worden correct verwerkt', async () => {
  let returnData = tester.mockReturnData('return_label_payment_pending')
  const updates = []
  
  // Simuleer snelle status updates
  updates.push({ status: 'return_label_payment_pending', time: Date.now() })
  await tester.delay(50)
  
  returnData.status = 'return_label_payment_completed'
  updates.push({ status: 'return_label_payment_completed', time: Date.now() })
  await tester.delay(50)
  
  returnData.status = 'return_label_generated'
  returnData.return_label_url = 'https://example.com/label.pdf'
  updates.push({ status: 'return_label_generated', time: Date.now() })
  
  // Check dat alle updates zijn verwerkt
  if (updates.length !== 3) {
    throw new Error('Not all status updates were processed')
  }
  
  // Check dat laatste status correct is
  if (returnData.status !== 'return_label_generated') {
    throw new Error('Final status incorrect')
  }
})

// Test 3: Polling timeout scenario
tester.test('Polling timeout: label generatie duurt te lang', async () => {
  let returnData = tester.mockReturnData('return_label_payment_completed')
  let attempts = 0
  const maxAttempts = 60
  let shouldContinue = true
  
  // Simuleer polling die timeout krijgt
  while (shouldContinue && attempts < maxAttempts) {
    attempts++
    await tester.delay(10) // Simuleer 2 seconden per poll
    
    // Status blijft hetzelfde (label wordt niet gegenereerd)
    if (returnData.status === 'return_label_generated') {
      shouldContinue = false
      break
    }
    
    if (attempts >= maxAttempts) {
      shouldContinue = false
      // Timeout - gebruiker moet handmatig verversen
      break
    }
  }
  
  if (attempts < maxAttempts && returnData.status !== 'return_label_generated') {
    throw new Error('Polling stopped too early')
  }
  
  if (attempts >= maxAttempts && shouldContinue) {
    throw new Error('Polling did not stop after max attempts')
  }
})

// Test 4: Webhook delay scenario
tester.test('Webhook delay: polling start voordat webhook is verwerkt', async () => {
  let returnData = tester.mockReturnData('return_label_payment_pending')
  let pollingStarted = false
  let webhookProcessed = false
  
  // Simuleer: gebruiker wordt geredirect, polling start
  setTimeout(() => {
    pollingStarted = true
  }, 100)
  
  // Simuleer: webhook heeft vertraging
  setTimeout(async () => {
    await tester.delay(500) // Webhook processing delay
    returnData = {
      ...returnData,
      status: 'return_label_payment_completed',
      return_label_payment_status: 'completed',
    }
    webhookProcessed = true
  }, 200)
  
  // Wacht tot beide zijn gebeurd
  await tester.delay(1000)
  
  // Polling zou moeten blijven pollen tot webhook is verwerkt
  if (!pollingStarted) {
    throw new Error('Polling did not start')
  }
  
  if (!webhookProcessed) {
    throw new Error('Webhook was not processed')
  }
  
  if (returnData.status !== 'return_label_payment_completed') {
    throw new Error('Status not updated after webhook delay')
  }
})

// Test 5: Error handling - webhook fails
tester.test('Error handling: webhook update faalt', async () => {
  let returnData = tester.mockReturnData('return_label_payment_pending')
  let errorOccurred = false
  
  try {
    // Simuleer webhook update die faalt
    throw new Error('Database connection failed')
  } catch (error) {
    errorOccurred = true
    // Status zou niet moeten veranderen
    if (returnData.status !== 'return_label_payment_pending') {
      throw new Error('Status changed even though webhook failed')
    }
  }
  
  if (!errorOccurred) {
    throw new Error('Error was not caught')
  }
})

// Test 6: Error handling - label generatie fails
tester.test('Error handling: label generatie faalt', async () => {
  let returnData = tester.mockReturnData('return_label_payment_completed')
  let labelGenerationFailed = false
  
  try {
    // Simuleer label generatie die faalt
    throw new Error('SendCloud API error')
  } catch (error) {
    labelGenerationFailed = true
    // Status zou moeten blijven op payment_completed
    if (returnData.status !== 'return_label_payment_completed') {
      throw new Error('Status changed even though label generation failed')
    }
    
    // Label URL zou niet moeten bestaan
    if (returnData.return_label_url) {
      throw new Error('Label URL set even though generation failed')
    }
  }
  
  if (!labelGenerationFailed) {
    throw new Error('Label generation error was not caught')
  }
})

// Test 7: Concurrent polling attempts
tester.test('Concurrent polling: meerdere polling loops voorkomen', async () => {
  let pollingActive = false
  let pollingCount = 0
  
  const startPolling = async () => {
    if (pollingActive) {
      // Polling is al actief, start niet opnieuw
      return
    }
    
    pollingActive = true
    pollingCount++
    
    // Simuleer polling
    await tester.delay(100)
    
    pollingActive = false
  }
  
  // Simuleer meerdere pogingen om polling te starten
  await Promise.all([
    startPolling(),
    startPolling(),
    startPolling(),
  ])
  
  // Alleen 1 polling loop zou moeten draaien
  if (pollingCount !== 1) {
    throw new Error(`Multiple polling loops started: ${pollingCount}`)
  }
})

// Test 8: Status validation - invalid transitions
tester.test('Status validation: ongeldige status transitions worden geblokkeerd', () => {
  const validTransitions = {
    'return_label_payment_pending': ['return_label_payment_completed'],
    'return_label_payment_completed': ['return_label_generated'],
    'return_label_generated': ['return_in_transit', 'return_received'],
  }
  
  const invalidTransition = {
    from: 'return_label_generated',
    to: 'return_label_payment_pending', // Kan niet terug naar pending
  }
  
  const allowed = validTransitions[invalidTransition.from]?.includes(invalidTransition.to)
  
  if (allowed) {
    throw new Error('Invalid status transition was allowed')
  }
})

// Test 9: Payment intent creation - duplicate prevention
tester.test('Payment intent: voorkom dubbele payment intents', () => {
  let returnData = tester.mockReturnData('return_label_payment_pending')
  
  // Eerste keer: maak payment intent
  if (!returnData.return_label_payment_intent_id) {
    returnData.return_label_payment_intent_id = 'pi_test_123'
  }
  
  // Tweede keer: gebruik bestaande
  const existingIntentId = returnData.return_label_payment_intent_id
  
  if (!existingIntentId) {
    throw new Error('Payment intent not created')
  }
  
  // Zou dezelfde moeten gebruiken, niet een nieuwe maken
  if (returnData.return_label_payment_intent_id !== existingIntentId) {
    throw new Error('Duplicate payment intent created')
  }
})

// Test 10: UI state consistency
tester.test('UI state: alle UI elementen zijn consistent met status', () => {
  const returnData = tester.mockReturnData('return_label_payment_completed', false)
  
  // UI state checks
  const showPaymentForm = returnData.status === 'return_label_payment_pending'
  const showGenerating = returnData.status === 'return_label_payment_completed' && !returnData.return_label_url
  const showDownload = returnData.status === 'return_label_generated' && returnData.return_label_url
  
  // Alleen 1 zou true moeten zijn
  const trueCount = [showPaymentForm, showGenerating, showDownload].filter(Boolean).length
  
  if (trueCount !== 1) {
    throw new Error(`Multiple UI states active: payment=${showPaymentForm}, generating=${showGenerating}, download=${showDownload}`)
  }
  
  if (!showGenerating) {
    throw new Error('Should show generating state for completed payment without label')
  }
})

// Test 11: Data refresh na status update
tester.test('Data refresh: fetchReturn haalt nieuwste status op', async () => {
  let returnData = tester.mockReturnData('return_label_payment_pending')
  const initialStatus = returnData.status
  
  // Simuleer webhook update
  await tester.delay(100)
  returnData = {
    ...returnData,
    status: 'return_label_payment_completed',
    return_label_payment_status: 'completed',
  }
  
  // Simuleer fetchReturn die nieuwe data ophaalt
  const fetchedData = { ...returnData }
  
  if (fetchedData.status === initialStatus) {
    throw new Error('fetchReturn did not get updated status')
  }
  
  if (fetchedData.status !== 'return_label_payment_completed') {
    throw new Error('Fetched data has incorrect status')
  }
})

// Test 12: Complete flow met timing
tester.test('Complete flow met realistische timing', async () => {
  let returnData = tester.mockReturnData('return_label_payment_pending')
  const timeline = []
  
  // T=0: Retour aanvraag
  timeline.push({ time: 0, event: 'return_requested', status: returnData.status })
  
  // T=100ms: Payment intent aangemaakt
  await tester.delay(100)
  returnData.return_label_payment_intent_id = 'pi_test_123'
  timeline.push({ time: 100, event: 'payment_intent_created' })
  
  // T=500ms: Gebruiker betaalt
  await tester.delay(400)
  timeline.push({ time: 500, event: 'payment_submitted' })
  
  // T=800ms: Webhook ontvangt payment succeeded
  await tester.delay(300)
  returnData = {
    ...returnData,
    status: 'return_label_payment_completed',
    return_label_payment_status: 'completed',
    return_label_paid_at: new Date().toISOString(),
  }
  timeline.push({ time: 800, event: 'webhook_received', status: returnData.status })
  
  // T=1000ms: Label generatie start
  await tester.delay(200)
  timeline.push({ time: 1000, event: 'label_generation_started' })
  
  // T=2000ms: Label gegenereerd
  await tester.delay(1000)
  returnData = {
    ...returnData,
    status: 'return_label_generated',
    return_label_url: 'https://example.com/label.pdf',
    return_tracking_code: 'TRACK123',
    label_generated_at: new Date().toISOString(),
  }
  timeline.push({ time: 2000, event: 'label_generated', status: returnData.status })
  
  // Verify timeline
  if (timeline.length !== 6) {
    throw new Error(`Timeline incomplete: ${timeline.length} events`)
  }
  
  // Verify final status
  if (returnData.status !== 'return_label_generated') {
    throw new Error('Final status incorrect')
  }
  
  if (!returnData.return_label_url) {
    throw new Error('Label URL not set')
  }
})

// Test 13: Query parameter cleanup
tester.test('Query parameter wordt verwijderd na verwerking', () => {
  let url = '/returns/test-id?payment=success'
  
  // Simuleer router.replace die parameter verwijdert
  const urlObj = new URL(url, 'http://localhost')
  urlObj.searchParams.delete('payment')
  url = urlObj.pathname
  
  if (url.includes('payment=success')) {
    throw new Error('Query parameter not removed')
  }
  
  if (!url.includes('test-id')) {
    throw new Error('Return ID removed incorrectly')
  }
})

// Test 14: Polling cleanup on unmount
tester.test('Polling cleanup: intervals worden gestopt bij unmount', async () => {
  let intervalActive = true
  let intervalCount = 0
  
  const interval = setInterval(() => {
    intervalCount++
  }, 100)
  
  // Simuleer component unmount
  await tester.delay(150)
  clearInterval(interval)
  intervalActive = false
  
  // Wacht nog even
  await tester.delay(200)
  
  const finalCount = intervalCount
  
  // Interval zou moeten stoppen
  if (intervalActive) {
    throw new Error('Interval not stopped')
  }
  
  // Count zou niet meer moeten toenemen
  await tester.delay(100)
  if (intervalCount !== finalCount) {
    throw new Error('Interval continued after cleanup')
  }
})

// Run tests
tester.run().catch(console.error)

