'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

type CourseRow = {
  course: {
    id: string
    name: string
    level: string
    description: string
    requirements: string
    capacity: number | null
    createdAt: string
  }
  applicantCount: number
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<{ name: string; level: string; description: string; requirements: string; capacity?: number }>({ name: '', level: '', description: '', requirements: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/courses').then(r => r.json()).then(data => {
      setCourses(data)
      setLoading(false)
    })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const newCourse = await res.json()
      setCourses(prev => [{ course: newCourse, applicantCount: 0 }, ...prev])
      setForm({ name: '', level: '', description: '', requirements: '', capacity: undefined })
      setShowForm(false)
    }
    setSubmitting(false)
  }

  return (
    <div className="">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[1.75rem] font-serif font-bold text-gray-900 leading-tight">Courses</h1>
          <p className="text-gray-400 mt-0.5 text-sm">{courses.length} courses available</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#473FCF] hover:bg-[#3935B8] text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Course
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Course</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 font-medium">Course name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  placeholder="Level 3 Digital Marketing"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">Level *</label>
                <select
                  value={form.level}
                  onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  required
                >
                  <option value="">Select level...</option>
                  <option>Level 1</option>
                  <option>Level 2</option>
                  <option>Level 3</option>
                  <option>Level 4</option>
                  <option>Level 5</option>
                  <option>Level 6</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 font-medium">Max capacity</label>
              <input
                type="number"
                min="1"
                value={form.capacity || ''}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value ? parseInt(e.target.value) : undefined }))}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                placeholder="e.g. 24"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 font-medium">Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2}
                placeholder="A brief description of the course..."
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 font-medium">Entry requirements *</label>
              <textarea
                value={form.requirements}
                onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
                placeholder="What background, skills, or qualifications does this course require? This is used by the AI to match applicants."
                required
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-[#473FCF] hover:bg-[#3935B8] text-white" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add course'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        {loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#E5E7EB] last:border-0">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-72" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-7 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-5 h-5 text-[#473FCF]" />
            </div>
            <p className="text-sm font-medium text-gray-700">No courses yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Add your courses so the AI can match applicants to the right programme.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-sm text-[#473FCF] hover:underline font-medium"
            >
              Add your first course →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Course</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Level</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applicants</th>
                <th className="text-left px-4 py-3 text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-wider">Capacity</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(row => (
                <tr key={row.course.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.course.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-indigo-50 text-[#3935B8] text-xs rounded-md font-medium">
                      {row.course.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs">
                    <p className="truncate">{row.course.description}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.applicantCount}</td>
                  <td className="px-4 py-3">
                    {row.course.capacity ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              (row.applicantCount / row.course.capacity) >= 0.9 ? 'bg-red-400' :
                              (row.applicantCount / row.course.capacity) >= 0.7 ? 'bg-amber-400' : 'bg-green-400'
                            )}
                            style={{ width: `${Math.min((row.applicantCount / row.course.capacity) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums">{row.applicantCount}/{row.course.capacity}</span>
                      </div>
                    ) : (
                      <span className="text-gray-200 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
