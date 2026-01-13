import { z } from 'zod'

export const registrationSchema = z.object({
  // Step 1 - Personal Information
  sabu_number: z.string().min(1, 'SABU Number is required'),
  full_names: z.string().min(2, 'Full names are required'),
  surname: z.string().min(2, 'Surname is required'),
  gender: z.enum(['Male', 'Female'], {
    required_error: 'Gender is required',
  }),
  sa_citizen: z.boolean(),
  rsa_id_number: z.string().length(13, 'RSA ID must be exactly 13 digits').regex(/^\d+$/, 'RSA ID must contain only numbers'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  mobile_number: z.string().min(10, 'Mobile number is required'),
  office_phone: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),

  // Step 2 - Contact & Club
  postal_address: z.string().min(1, 'Postal address is required'),
  postal_code: z.string().min(4, 'Postal code is required').max(4, 'Postal code must be 4 digits'),
  province: z.string().min(1, 'Province is required'),
  club: z.string().min(1, 'Club is required'),
  emergency_contact_name: z.string().min(1, 'Emergency contact name is required'),
  emergency_contact_phone: z.string().min(10, 'Emergency contact phone is required'),
  medical_info: z.string().optional(),
  preferred_disciplines: z.array(z.string()).optional(),

  // Step 3 - Shooting Details
  shoulder_preference: z.enum(['left', 'right'], {
    required_error: 'Shoulder preference is required',
  }),
  first_sa_championships: z.boolean(),
  // Role is restricted - only 'shooter', 'range_officer', and 'stats_officer' can be self-selected
  // 'team_captain', 'admin', and 'super_admin' must be assigned by administrators
  role: z.enum(['shooter', 'range_officer', 'stats_officer']).default('shooter'),
})

export const registrationSchemaWithConfirm = registrationSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
)

export type RegistrationFormData = z.infer<typeof registrationSchemaWithConfirm>

// Step schemas for individual validation
export const step1Schema = registrationSchema.pick({
  sabu_number: true,
  full_names: true,
  surname: true,
  gender: true,
  sa_citizen: true,
  rsa_id_number: true,
  date_of_birth: true,
  mobile_number: true,
  office_phone: true,
  email: true,
  password: true,
  confirmPassword: true,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const step2Schema = registrationSchema.pick({
  postal_address: true,
  postal_code: true,
  province: true,
  club: true,
  emergency_contact_name: true,
  emergency_contact_phone: true,
  medical_info: true,
  preferred_disciplines: true,
})

export const step3Schema = registrationSchema.pick({
  shoulder_preference: true,
  first_sa_championships: true,
  role: true,
})

// Age classification calculation
export function calculateAgeClassification(dateOfBirth: string): 'Open' | 'Under_19' | 'Under_25' | 'Veteran_60_plus' | 'Veteran_70_plus' {
  const birthDate = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  if (age < 19) {
    return 'Under_19'
  } else if (age < 25) {
    return 'Under_25'
  } else if (age >= 70) {
    return 'Veteran_70_plus'
  } else if (age >= 60) {
    return 'Veteran_60_plus'
  } else {
    return 'Open'
  }
}

// RSA Provinces
export const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
]

