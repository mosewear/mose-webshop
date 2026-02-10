import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'

interface SurveyResponse {
  purchase_likelihood: string
  what_needed: string[]
  first_impression: string | null
  created_at: string
}

export async function GET() {
  try {
    const { authorized, supabase } = await requireAdmin()

    if (!authorized || !supabase) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all responses
    const { data: responses, error } = await supabase
      .from('survey_responses')
      .select('purchase_likelihood, what_needed, first_impression, created_at')

    if (error) {
      console.error('Error fetching survey stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch stats', details: error.message },
        { status: 500 }
      )
    }

    // Calculate purchase likelihood stats
    const likelihoodStats: Record<string, number> = {}
    ;(responses as SurveyResponse[] | null)?.forEach((r) => {
      likelihoodStats[r.purchase_likelihood] = (likelihoodStats[r.purchase_likelihood] || 0) + 1
    })

    // Calculate what_needed stats
    const neededStats: Record<string, number> = {}
    ;(responses as SurveyResponse[] | null)?.forEach((r) => {
      if (Array.isArray(r.what_needed)) {
        r.what_needed.forEach((item: string) => {
          neededStats[item] = (neededStats[item] || 0) + 1
        })
      }
    })

    // Get first impressions (non-empty)
    const firstImpressions = (responses as SurveyResponse[] | null)
      ?.filter((r) => r.first_impression && r.first_impression.trim().length > 0)
      .map((r) => r.first_impression)
      .slice(0, 50) || []

    return NextResponse.json({
      total: responses?.length || 0,
      likelihoodStats,
      neededStats,
      firstImpressions,
    })
  } catch (error: any) {
    console.error('Error in survey stats route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

