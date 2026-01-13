'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { 
  registrationSchemaWithConfirm, 
  step1Schema, 
  step2Schema, 
  step3Schema,
  calculateAgeClassification,
  SA_PROVINCES,
  type RegistrationFormData 
} from '@/lib/validations/registration'
import { ChevronLeft, ChevronRight, Save, User, MapPin, Target, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Discipline = Database['public']['Tables']['disciplines']['Row']

const STORAGE_KEY = 'registration_draft'

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading, setLoading] = useState(false)
  const [checkingSabu, setCheckingSabu] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    trigger,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchemaWithConfirm),
    mode: 'onChange',
    defaultValues: {
      role: 'shooter',
      sa_citizen: true,
      first_sa_championships: false,
      preferred_disciplines: [],
    },
  })

  const watchedValues = watch()

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(STORAGE_KEY)
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        Object.keys(parsed).forEach((key) => {
          setValue(key as keyof RegistrationFormData, parsed[key])
        })
        toast.info('Draft loaded from previous session')
      } catch (error) {
        console.error('Error loading draft:', error)
      }
    }
  }, [setValue])

  // Save draft to localStorage (excluding password for security)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const draftData = { ...watchedValues }
      // Don't save passwords to localStorage for security
      delete draftData.password
      delete draftData.confirmPassword
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData))
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [watchedValues])

  // Fetch disciplines
  useEffect(() => {
    const fetchDisciplines = async () => {
      const { data } = await supabase
        .from('disciplines')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (data) {
        setDisciplines(data)
      }
    }
    fetchDisciplines()
  }, [supabase])

  // Check SABU number uniqueness
  const checkSabuNumber = async (sabuNumber: string) => {
    if (!sabuNumber) return true
    
    setCheckingSabu(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('sabu_number')
      .eq('sabu_number', sabuNumber)
      .single()

    setCheckingSabu(false)
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is what we want
      return false
    }
    
    return !data
  }

  const validateStep = async (step: number): Promise<boolean> => {
    let schema
    switch (step) {
      case 1:
        schema = step1Schema
        break
      case 2:
        schema = step2Schema
        break
      case 3:
        schema = step3Schema
        break
      default:
        return false
    }

    const result = await trigger(Object.keys(schema.shape) as Array<keyof RegistrationFormData>)
    return result
  }

  const handleNext = async () => {
    const isValidStep = await validateStep(currentStep)
    if (!isValidStep) {
      toast.error('Please fill in all required fields correctly')
      return
    }

    // Special validation for SABU number
    if (currentStep === 1) {
      const sabuNumber = watch('sabu_number')
      if (sabuNumber) {
        const isUnique = await checkSabuNumber(sabuNumber)
        if (!isUnique) {
          toast.error('SABU Number already exists. Please use a different number.')
          return
        }
      }
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = async (data: RegistrationFormData) => {
    setLoading(true)

    try {
      // Check SABU number one more time
      const isUnique = await checkSabuNumber(data.sabu_number)
      if (!isUnique) {
        toast.error('SABU Number already exists. Please use a different number.')
        setLoading(false)
        return
      }

      // Calculate age classification
      const ageClassification = calculateAgeClassification(data.date_of_birth)

      // Sign up user with email and password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/login?verified=true`,
          data: {
            full_names: data.full_names,
            surname: data.surname,
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      // Wait for the auth user to be fully committed to the database
      // The foreign key constraint requires the user to exist in auth.users first
      let userExists = false
      let retries = 0
      const maxRetries = 10
      
      while (!userExists && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Verify user exists in auth by checking if we can get user metadata
        const { data: { user: verifyUser } } = await supabase.auth.getUser()
        if (verifyUser && verifyUser.id === authData.user.id) {
          userExists = true
        }
        retries++
      }
      
      if (!userExists) {
        throw new Error('User account creation is still processing. Please wait a moment and try again.')
      }

      // Create or update profile (use upsert in case trigger already created one)
      // Ensure role is only one of the allowed self-selected roles (prevent manipulation)
      const allowedRoles = ['shooter', 'range_officer', 'stats_officer'] as const
      const userRole = allowedRoles.includes(data.role as any) ? data.role : 'shooter'
      
      const profileData = {
        id: authData.user.id,
        sabu_number: data.sabu_number,
        full_names: data.full_names,
        surname: data.surname,
        gender: data.gender,
        sa_citizen: data.sa_citizen,
        rsa_id_number: data.rsa_id_number,
        date_of_birth: data.date_of_birth,
        mobile_number: data.mobile_number,
        office_phone: data.office_phone || null,
        email: data.email,
        postal_address: data.postal_address,
        postal_code: data.postal_code,
        province: data.province,
        club: data.club,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        medical_info: data.medical_info || null,
        preferred_disciplines: data.preferred_disciplines || [],
        shoulder_preference: data.shoulder_preference,
        first_sa_championships: data.first_sa_championships,
        role: userRole, // Only allow self-selected roles, default to 'shooter' if invalid
        age_classification: ageClassification,
      }

      // Validate required fields before attempting insert
      if (!profileData.id || !profileData.full_names) {
        throw new Error('Missing required fields: id and full_names are required')
      }

      // Use API route with service role key to bypass RLS
      const profileResponse = await fetch('/api/profile/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: authData.user.id,
          profileData,
        }),
      })

      const profileResult = await profileResponse.json()

      if (!profileResponse.ok || !profileResult.success) {
        throw new Error(profileResult.error || 'Failed to create profile')
      }

      console.log('Profile created/updated successfully:', profileResult.data?.id)

      // Clear draft
      localStorage.removeItem(STORAGE_KEY)

      toast.success('Registration successful! Please check your email to verify your account. You can then log in with your email and password.')
      router.push('/login?message=Please check your email to verify your account')
    } catch (error: any) {
      console.error('Registration error:', error)
      
      // Better error handling for Supabase errors
      let errorMessage = 'Registration failed. Please try again.'
      
      if (error) {
        // Supabase errors have a message property
        if (error.message) {
          errorMessage = error.message
        } 
        // Some errors might be stringified
        else if (typeof error === 'string') {
          errorMessage = error
        }
        // Check for common error patterns
        else if (error.code) {
          switch (error.code) {
            case '23505': // Unique constraint violation
              errorMessage = 'This email or SABU number is already registered.'
              break
            case '23503': // Foreign key violation
              errorMessage = 'Invalid data provided. Please check your entries.'
              break
            case '42501': // Insufficient privileges
              errorMessage = 'Permission denied. Please contact support.'
              break
            default:
              errorMessage = error.hint || error.details || `Error: ${error.code}`
          }
        }
        // Log full error for debugging
        else {
          console.error('Full error object:', JSON.stringify(error, null, 2))
          errorMessage = 'An unexpected error occurred. Please try again or contact support.'
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Personal Information', icon: User },
    { number: 2, title: 'Contact & Club', icon: MapPin },
    { number: 3, title: 'Shooting Details', icon: Target },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isActive
                          ? 'bg-[#1e40af] border-[#1e40af] text-white'
                          : isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <StepIcon className="h-6 w-6" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-sm font-medium ${
                        isActive ? 'text-[#1e40af]' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-md p-8">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SABU Number *
                  </label>
                  <input
                    {...register('sabu_number')}
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${
                      errors.sabu_number ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter SABU Number"
                  />
                  {checkingSabu && <p className="text-sm text-gray-500 mt-1">Checking...</p>}
                  {errors.sabu_number && (
                    <p className="text-sm text-red-500 mt-1">{errors.sabu_number.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="your.email@example.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent pr-10 ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Must be at least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent pr-10 ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Names *
                  </label>
                  <input
                    {...register('full_names')}
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${
                      errors.full_names ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="John"
                  />
                  {errors.full_names && (
                    <p className="text-sm text-red-500 mt-1">{errors.full_names.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Surname *
                  </label>
                  <input
                    {...register('surname')}
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${
                      errors.surname ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Doe"
                  />
                  {errors.surname && (
                    <p className="text-sm text-red-500 mt-1">{errors.surname.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        {...register('gender')}
                        type="radio"
                        value="Male"
                        className="mr-2"
                      />
                      Male
                    </label>
                    <label className="flex items-center">
                      <input
                        {...register('gender')}
                        type="radio"
                        value="Female"
                        className="mr-2"
                      />
                      Female
                    </label>
                  </div>
                  {errors.gender && (
                    <p className="text-sm text-red-500 mt-1">{errors.gender.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SA Citizen *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={watch('sa_citizen') === true}
                        onChange={() => setValue('sa_citizen', true, { shouldValidate: true })}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={watch('sa_citizen') === false}
                        onChange={() => setValue('sa_citizen', false, { shouldValidate: true })}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RSA ID Number *
                  </label>
                  <input
                    {...register('rsa_id_number')}
                    type="text"
                    maxLength={13}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${
                      errors.rsa_id_number ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="13 digits"
                  />
                  {errors.rsa_id_number && (
                    <p className="text-sm text-red-500 mt-1">{errors.rsa_id_number.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    {...register('date_of_birth')}
                    type="date"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${
                      errors.date_of_birth ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.date_of_birth && (
                    <p className="text-sm text-red-500 mt-1">{errors.date_of_birth.message}</p>
                  )}
                  {watch('date_of_birth') && (
                    <p className="text-sm text-gray-500 mt-1">
                      Age Classification: {calculateAgeClassification(watch('date_of_birth'))}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number *
                  </label>
                  <input
                    {...register('mobile_number')}
                    type="tel"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${
                      errors.mobile_number ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="082 123 4567"
                  />
                  {errors.mobile_number && (
                    <p className="text-sm text-red-500 mt-1">{errors.mobile_number.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Office Phone
                  </label>
                  <input
                    {...register('office_phone')}
                    type="tel"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    placeholder="011 123 4567"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact & Club */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact & Club</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Address *
                  </label>
                  <textarea
                    {...register('postal_address')}
                    rows={3}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${
                      errors.postal_address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Street address, PO Box, etc."
                  />
                  {errors.postal_address && (
                    <p className="text-sm text-red-500 mt-1">{errors.postal_address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code *
                    </label>
                    <input
                      {...register('postal_code')}
                      type="text"
                      maxLength={4}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${
                        errors.postal_code ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0000"
                    />
                    {errors.postal_code && (
                      <p className="text-sm text-red-500 mt-1">{errors.postal_code.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Province *
                    </label>
                    <select
                      {...register('province')}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${
                        errors.province ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Province</option>
                      {SA_PROVINCES.map((province) => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                    {errors.province && (
                      <p className="text-sm text-red-500 mt-1">{errors.province.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Club *
                  </label>
                  <input
                    {...register('club')}
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${
                      errors.club ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Your shooting club name"
                  />
                  {errors.club && (
                    <p className="text-sm text-red-500 mt-1">{errors.club.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact Name *
                    </label>
                    <input
                      {...register('emergency_contact_name')}
                      type="text"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${
                        errors.emergency_contact_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.emergency_contact_name && (
                      <p className="text-sm text-red-500 mt-1">{errors.emergency_contact_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact Phone *
                    </label>
                    <input
                      {...register('emergency_contact_phone')}
                      type="tel"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${
                        errors.emergency_contact_phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.emergency_contact_phone && (
                      <p className="text-sm text-red-500 mt-1">{errors.emergency_contact_phone.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Information
                  </label>
                  <textarea
                    {...register('medical_info')}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    placeholder="Any medical conditions or allergies we should know about"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Disciplines
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-4">
                    {disciplines.map((discipline) => (
                      <label key={discipline.id} className="flex items-center">
                        <input
                          type="checkbox"
                          value={discipline.id}
                          checked={watch('preferred_disciplines')?.includes(discipline.id) || false}
                          onChange={(e) => {
                            const current = watch('preferred_disciplines') || []
                            if (e.target.checked) {
                              setValue('preferred_disciplines', [...current, discipline.id])
                            } else {
                              setValue('preferred_disciplines', current.filter((id) => id !== discipline.id))
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{discipline.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Shooting Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Shooting Details</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shoulder Preference *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        {...register('shoulder_preference')}
                        type="radio"
                        value="left"
                        className="mr-2"
                      />
                      Left
                    </label>
                    <label className="flex items-center">
                      <input
                        {...register('shoulder_preference')}
                        type="radio"
                        value="right"
                        className="mr-2"
                      />
                      Right
                    </label>
                  </div>
                  {errors.shoulder_preference && (
                    <p className="text-sm text-red-500 mt-1">{errors.shoulder_preference.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First SA Championships? *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={watch('first_sa_championships') === true}
                        onChange={() => setValue('first_sa_championships', true, { shouldValidate: true })}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={watch('first_sa_championships') === false}
                        onChange={() => setValue('first_sa_championships', false, { shouldValidate: true })}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    {...register('role')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    defaultValue="shooter"
                  >
                    <option value="shooter">Shooter</option>
                    <option value="range_officer">Range Officer</option>
                    <option value="stats_officer">Stats Officer</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Default: Shooter. Special roles (Team Captain, Admin) must be assigned by administrators.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`flex items-center px-6 py-2 border rounded-lg transition-colors ${
                currentStep === 1
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Previous
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
              >
                Next
                <ChevronRight className="h-5 w-5 ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Complete Registration
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
