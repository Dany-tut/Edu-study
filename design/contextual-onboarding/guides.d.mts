export type GuideId = 'roster' | 'course' | 'work' | 'schedule' | 'journal' | 'finance' | 'learner' | 'profile'
export const sections: Record<GuideId, [string, string, string]>
export const guides: Record<GuideId, [string, string, string, string][]>
export const pupilViews: { label: string; file: string; caption: string }[]
export const attempts: { label: string; file: string; status: string; answer: string; comment: string }[]
