'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle,
  Circle,
  ArrowRight,
  Target,
  Calendar,
  FileText,
  CheckSquare,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface TestStep {
  id: string
  description: string
  action: string
  path?: string
  verification?: string
  completed: boolean
}

interface TestCategory {
  id: string
  title: string
  icon: React.ReactNode
  description: string
  steps: TestStep[]
}

export default function AdminTestGuidePage() {
  const [testProgress, setTestProgress] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const supabase = createClient()

  const toggleStep = (categoryId: string, stepId: string) => {
    const key = `${categoryId}-${stepId}`
    setTestProgress((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const getStepStatus = (categoryId: string, stepId: string) => {
    return testProgress[`${categoryId}-${stepId}`] || false
  }

  const getCategoryProgress = (category: TestCategory) => {
    const completed = category.steps.filter((step) => getStepStatus(category.id, step.id)).length
    return { completed, total: category.steps.length }
  }

  const allCategories: TestCategory[] = [
    {
      id: 'disciplines',
      title: 'Discipline Management',
      icon: <Target className="h-6 w-6" />,
      description: 'Test creating, editing, and managing shooting disciplines',
      steps: [
        {
          id: '1',
          description: 'Navigate to Discipline Management page',
          action: 'Go to /admin/disciplines',
          path: '/admin/disciplines',
          verification: 'Should see table of all disciplines',
          completed: false,
        },
        {
          id: '2',
          description: 'Create a new test discipline',
          action: 'Click "Add Discipline" button',
          verification: 'Form should open with all fields',
          completed: false,
        },
        {
          id: '3',
          description: 'Fill in discipline details',
          action: 'Enter: Name, Code, Description, Equipment Requirements, Rules Summary',
          verification: 'All fields accept input',
          completed: false,
        },
        {
          id: '4',
          description: 'Set discipline color',
          action: 'Use color picker to select a color',
          verification: 'Color is saved and displayed',
          completed: false,
        },
        {
          id: '5',
          description: 'Save new discipline',
          action: 'Click "Save" button',
          verification: 'Discipline appears in table, success message shown',
          completed: false,
        },
        {
          id: '6',
          description: 'Edit existing discipline',
          action: 'Click "Edit" on any discipline',
          verification: 'Form opens with pre-filled data',
          completed: false,
        },
        {
          id: '7',
          description: 'Update discipline details',
          action: 'Modify description or other fields, save',
          verification: 'Changes are saved and reflected in table',
          completed: false,
        },
        {
          id: '8',
          description: 'Reorder disciplines',
          action: 'Drag and drop disciplines to reorder',
          verification: 'Order updates, display_order field changes',
          completed: false,
        },
        {
          id: '9',
          description: 'Verify dropdown updates',
          action: 'Check navigation menu "Shooting Disciplines" dropdown',
          path: '/',
          verification: 'New discipline appears in dropdown, ordered correctly',
          completed: false,
        },
        {
          id: '10',
          description: 'Verify discipline appears on public page',
          action: 'Visit /shooting-disciplines',
          path: '/shooting-disciplines',
          verification: 'New discipline appears in the grid',
          completed: false,
        },
      ],
    },
    {
      id: 'competitions',
      title: 'Competition Management',
      icon: <Calendar className="h-6 w-6" />,
      description: 'Test creating competitions with all features',
      steps: [
        {
          id: '1',
          description: 'Navigate to Competition Management',
          action: 'Go to /admin/competitions',
          path: '/admin/competitions',
          verification: 'Should see competitions table or create form',
          completed: false,
        },
        {
          id: '2',
          description: 'Start creating new competition',
          action: 'Click "Create Competition" or "Add Competition"',
          verification: 'Form opens with all sections',
          completed: false,
        },
        {
          id: '3',
          description: 'Fill Basic Information',
          action: 'Enter: Name, Start Date (next month), End Date, Location, Venue Details, Description',
          verification: 'All fields accept input, dates are valid',
          completed: false,
        },
        {
          id: '4',
          description: 'Add all disciplines',
          action: 'Select all available disciplines from multi-select',
          verification: 'All disciplines are selected',
          completed: false,
        },
        {
          id: '5',
          description: 'Set fee structures for each discipline',
          action: 'For each discipline, enter: Standard fee, U19 fee, U25 fee, Max entries',
          verification: 'Fees are saved for each discipline',
          completed: false,
        },
        {
          id: '6',
          description: 'Add all 12 matches',
          action: 'Add matches: SCOTTISH_SWORD, FREESTATE_CUP, KINGS_NORTON, DALRYMPLE_CUP, DAVE_SMITH_CUP, and 7 more',
          verification: 'All matches are added with dates and fees',
          completed: false,
        },
        {
          id: '7',
          description: 'Set registration dates',
          action: 'Set: Registration opens date, Registration closes date, Late registration date',
          verification: 'Dates are set correctly',
          completed: false,
        },
        {
          id: '8',
          description: 'Set capacity and fees',
          action: 'Enter: Capacity, Standard fees (range, late, permit)',
          verification: 'All fee fields are saved',
          completed: false,
        },
        {
          id: '9',
          description: 'Save competition',
          action: 'Click "Save" or "Create Competition"',
          verification: 'Success message, competition appears in list',
          completed: false,
        },
        {
          id: '10',
          description: 'Verify competition appears in calendar',
          action: 'Visit /events page',
          path: '/events',
          verification: 'Competition appears on calendar with correct dates',
          completed: false,
        },
        {
          id: '11',
          description: 'Verify competition detail page',
          action: 'Click on competition in calendar or visit /events/[id]',
          verification: 'All details displayed correctly, disciplines and matches shown',
          completed: false,
        },
      ],
    },
    {
      id: 'news',
      title: 'News Management',
      icon: <FileText className="h-6 w-6" />,
      description: 'Test creating and publishing news posts',
      steps: [
        {
          id: '1',
          description: 'Navigate to News Management',
          action: 'Go to /admin/news',
          path: '/admin/news',
          verification: 'Should see table of all news posts',
          completed: false,
        },
        {
          id: '2',
          description: 'Create new news post',
          action: 'Click "Add News Post" or "Create Post"',
          verification: 'Form opens with all fields',
          completed: false,
        },
        {
          id: '3',
          description: 'Fill in post details',
          action: 'Enter: Title, Category, Excerpt',
          verification: 'All text fields accept input',
          completed: false,
        },
        {
          id: '4',
          description: 'Test rich text editor',
          action: 'Add formatted content: headings, bold, italic, lists, links',
          verification: 'Formatting toolbar works, content saves correctly',
          completed: false,
        },
        {
          id: '5',
          description: 'Add featured image',
          action: 'Upload an image or enter image URL',
          verification: 'Image uploads/previews correctly',
          completed: false,
        },
        {
          id: '6',
          description: 'Mark as featured',
          action: 'Check "Featured Post" checkbox',
          verification: 'Checkbox saves state',
          completed: false,
        },
        {
          id: '7',
          description: 'Publish immediately',
          action: 'Check "Publish immediately" or set published_at date',
          verification: 'Post status is set to published',
          completed: false,
        },
        {
          id: '8',
          description: 'Save news post',
          action: 'Click "Save" or "Publish"',
          verification: 'Success message, post appears in table',
          completed: false,
        },
        {
          id: '9',
          description: 'Verify post shows on homepage',
          action: 'Visit homepage /',
          path: '/',
          verification: 'Featured post appears in News section',
          completed: false,
        },
        {
          id: '10',
          description: 'Verify post shows on news page',
          action: 'Visit /news',
          path: '/news',
          verification: 'Post appears in news grid with correct category',
          completed: false,
        },
        {
          id: '11',
          description: 'Verify post detail page',
          action: 'Click on post to view detail page',
          verification: 'Full content displays, rich text formatting preserved',
          completed: false,
        },
      ],
    },
    {
      id: 'scores',
      title: 'Score Verification',
      icon: <CheckSquare className="h-6 w-6" />,
      description: 'Test score submission and verification workflow',
      steps: [
        {
          id: '1',
          description: 'Log in as regular user',
          action: 'Log out if admin, log in as shooter1@test.com / Test123!',
          path: '/login',
          verification: 'Logged in as regular user',
          completed: false,
        },
        {
          id: '2',
          description: 'Register for competition',
          action: 'Go to /events, find a competition, click Register',
          path: '/events',
          verification: 'Registration form opens',
          completed: false,
        },
        {
          id: '3',
          description: 'Complete registration',
          action: 'Select discipline, matches, submit registration',
          verification: 'Registration successful, entry number shown',
          completed: false,
        },
        {
          id: '4',
          description: 'Navigate to scoring page',
          action: 'Go to /scoring',
          path: '/scoring',
          verification: 'Shows registered competitions',
          completed: false,
        },
        {
          id: '5',
          description: 'Select competition',
          action: 'Click on registered competition',
          verification: 'Shows stages and score entry grid',
          completed: false,
        },
        {
          id: '6',
          description: 'Enter test scores',
          action: 'Fill in scores for all rounds: Score (0-5), X checkbox, V checkbox',
          verification: 'Scores are entered, running total updates',
          completed: false,
        },
        {
          id: '7',
          description: 'Save draft',
          action: 'Click "Save Draft"',
          verification: 'Draft saved to localStorage, success message',
          completed: false,
        },
        {
          id: '8',
          description: 'Submit for verification',
          action: 'Click "Submit for Verification"',
          verification: 'Score submitted, status shows as Pending',
          completed: false,
        },
        {
          id: '9',
          description: 'Log out and switch to admin',
          action: 'Log out, log in as admin account',
          path: '/login',
          verification: 'Logged in as admin',
          completed: false,
        },
        {
          id: '10',
          description: 'Navigate to Score Verification',
          action: 'Go to /admin/verify-scores',
          path: '/admin/verify-scores',
          verification: 'Shows table of submitted scores',
          completed: false,
        },
        {
          id: '11',
          description: 'Find submitted score',
          action: 'Filter by competition/discipline, find your test score',
          verification: 'Score appears in table with Pending status',
          completed: false,
        },
        {
          id: '12',
          description: 'Verify score',
          action: 'Click "Quick Verify" or verify button',
          verification: 'Status changes to Verified, verified_by and verified_at set',
          completed: false,
        },
        {
          id: '13',
          description: 'Check leaderboard updates',
          action: 'Go to /results, select competition',
          path: '/results',
          verification: 'Verified score appears in results table, position calculated',
          completed: false,
        },
        {
          id: '14',
          description: 'Test reject functionality',
          action: 'Submit another test score, reject it with reason',
          verification: 'Score status changes to Rejected, reason saved',
          completed: false,
        },
      ],
    },
  ]

  const totalSteps = allCategories.reduce((sum, cat) => sum + cat.steps.length, 0)
  const completedSteps = allCategories.reduce(
    (sum, cat) => sum + cat.steps.filter((step) => getStepStatus(cat.id, step.id)).length,
    0
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Testing Guide</h1>
              <p className="text-gray-600 mt-2">Systematic testing of all admin features</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#1e40af]">
                {completedSteps}/{totalSteps}
              </div>
              <div className="text-sm text-gray-600">Steps Completed</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-[#1e40af] h-4 rounded-full transition-all"
              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Test Categories */}
        {allCategories.map((category) => {
          const progress = getCategoryProgress(category)
          return (
            <div key={category.id} className="bg-white rounded-lg shadow-md p-6 mb-6">
              {/* Category Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-[#1e40af]">
                    {category.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{category.title}</h2>
                    <p className="text-gray-600 mt-1">{category.description}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      {progress.completed}/{progress.total} steps completed
                    </div>
                  </div>
                </div>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-700">
                    {Math.round((progress.completed / progress.total) * 100)}%
                  </span>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {category.steps.map((step, index) => {
                  const isCompleted = getStepStatus(category.id, step.id)
                  return (
                    <div
                      key={step.id}
                      className={`border-2 rounded-lg p-4 transition-all ${
                        isCompleted
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 bg-gray-50 hover:border-[#1e40af]'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => toggleStep(category.id, step.id)}
                          className="mt-1 flex-shrink-0"
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : (
                            <Circle className="h-6 w-6 text-gray-400 hover:text-[#1e40af]" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900">
                              Step {index + 1}: {step.description}
                            </span>
                          </div>
                          <div className="bg-white rounded p-3 mb-2">
                            <div className="text-sm font-medium text-gray-700 mb-1">Action:</div>
                            <div className="text-sm text-gray-900">{step.action}</div>
                          </div>
                          {step.verification && (
                            <div className="bg-blue-50 rounded p-3 mb-3">
                              <div className="text-sm font-medium text-blue-700 mb-1">
                                Verification:
                              </div>
                              <div className="text-sm text-blue-900">{step.verification}</div>
                            </div>
                          )}
                          {step.path && (
                            <Link
                              href={step.path}
                              target={step.path.startsWith('http') ? '_blank' : undefined}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors text-sm"
                            >
                              {step.path.startsWith('http') ? (
                                <>
                                  Open Link <ExternalLink className="h-4 w-4" />
                                </>
                              ) : (
                                <>
                                  Go to Page <ArrowRight className="h-4 w-4" />
                                </>
                              )}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <div className="font-semibold text-gray-900">Admin Dashboard</div>
              <div className="text-sm text-gray-600">View admin overview</div>
            </Link>
            <Link
              href="/test"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <div className="font-semibold text-gray-900">Feature Test Dashboard</div>
              <div className="text-sm text-gray-600">Check feature status</div>
            </Link>
            <Link
              href="/debug"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <div className="font-semibold text-gray-900">Debug Dashboard</div>
              <div className="text-sm text-gray-600">System diagnostics</div>
            </Link>
          </div>
        </div>

        {/* Reset Progress */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              if (confirm('Reset all test progress?')) {
                setTestProgress({})
              }
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Reset Progress
          </button>
        </div>
      </div>
    </div>
  )
}

