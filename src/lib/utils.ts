import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Email validation function
export function validateEmail(email: string): { isValid: boolean; message?: string } {
  if (!email || email.trim() === '') {
    return { isValid: false, message: 'Email is required' };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }

  // Check for common disposable email domains
  const disposableDomains = [
    'tempmail.org', 'guerrillamail.com', 'mailinator.com', '10minutemail.com',
    'throwaway.email', 'temp-mail.org', 'sharklasers.com', 'getairmail.com'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (disposableDomains.includes(domain)) {
    return { isValid: false, message: 'Disposable email addresses are not allowed' };
  }

  // Check email length
  if (email.length > 254) {
    return { isValid: false, message: 'Email address is too long' };
  }

  return { isValid: true };
}

// Enhanced email validation with more checks
export function validateEmailStrict(email: string): { isValid: boolean; message?: string } {
  const basicValidation = validateEmail(email);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // Additional checks for production use
  const domain = email.split('@')[1]?.toLowerCase();
  
  // Check for valid TLD
  const validTLDs = ['com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'co', 'io', 'ai', 'app', 'dev'];
  const tld = domain?.split('.').pop();
  if (!tld || !validTLDs.includes(tld)) {
    return { isValid: false, message: 'Please use a valid email domain' };
  }

  return { isValid: true };
}
