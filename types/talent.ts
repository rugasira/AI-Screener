export interface Skill {
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  yearsOfExperience: number;
}

export interface Language {
  name: string;
  proficiency: 'Basic' | 'Conversational' | 'Fluent' | 'Native';
}

export interface Experience {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  technologies: string[];
  isCurrent: boolean;
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear: number;
}

export interface Certification {
  name: string;
  issuer: string;
  issueDate: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  role: string;
  link: string;
  startDate: string;
  endDate: string;
}

export interface Availability {
  status: 'Available' | 'Open to Opportunities' | 'Not Available';
  type: 'Full-time' | 'Part-time' | 'Contract';
  startDate?: string;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  [key: string]: string | undefined;
}

export interface TalentProfile {
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  bio?: string;
  location: string;
  skills: Skill[];
  languages?: Language[];
  experience: Experience[];
  education: Education[];
  certifications?: Certification[];
  projects: Project[];
  availability: Availability;
  socialLinks?: SocialLinks;
}

export interface Applicant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  education?: string;
  experience?: string;
  skills?: string[];
  jobId: string;
  profileData: TalentProfile & { resumeText?: string };
  source: 'PDF' | 'CSV' | 'Direct';
  fileName?: string;
  createdAt: string;
}
