'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  BookOpen,
  Plus,
  LogOut,
  User,
  Settings,
  Crown,
  Download,
  Play,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
  Palette,
  Image as ImageIcon,
  FileText,
  CreditCard,
  Mic,
} from 'lucide-react'
import { BOOK_CATEGORIES, COLORING_THEMES, IMAGE_STYLES } from '@/lib/book-types'

// Types
type BookCategory = 'EBOOK' | 'NOVEL' | 'KIDS_STORY' | 'COLORING_BOOK' | 'BLANK_NOTEBOOK' | 'AUDIO_BOOK'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  membershipType: string
}

interface Book {
  id: string
  title: string
  category: string
  status: string
  pageCount: number
  createdAt: string
}

interface PricingPlan {
  name: string
  price: number
  interval: string
  maxBooks: number
  maxPagesPerBook: number
  imageGeneration: boolean
  premiumTemplates: boolean
}

export default function BookPlatform() {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Forms
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerName, setRegisterName] = useState('')

  // New Book Form
  const [newBook, setNewBook] = useState({
    title: '',
    category: 'EBOOK' as BookCategory,
    pageCount: 75,
    systemPrompt: '',
    userPrompt: '',
    imageStyle: 'pixar',
    coloringTheme: 'Mandalas',
    authorStyle: '',
    hasAudio: false,
  })

  useEffect(() => {
    // Check for existing token
    const storedToken = localStorage.getItem('authToken')
    if (storedToken) {
      setToken(storedToken)
      loadUser(storedToken)
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) {
      loadBooks()
      loadPricingPlans()
    }
  }, [token])

  const loadUser = async (authToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const data = await response.json()
      if (data.success) {
        setUser(data.user)
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      localStorage.removeItem('authToken')
    } finally {
      setLoading(false)
    }
  }

  const loadBooks = async () => {
    try {
      const response = await fetch('/api/books', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setBooks(data.books)
      }
    } catch (error) {
      console.error('Failed to load books:', error)
    }
  }

  const loadPricingPlans = async () => {
    try {
      const response = await fetch('/api/pricing/init')
      const data = await response.json()
      if (data.success) {
        setPricingPlans(data.plans)
      }
    } catch (error) {
      console.error('Failed to load pricing:', error)
    }
  }

  const handleLogin = async () => {
    setActionLoading('login')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      })

      const data = await response.json()
      if (data.success) {
        localStorage.setItem('authToken', data.token)
        setToken(data.token)
        setUser(data.user)
      } else {
        alert(data.error || 'Login failed')
      }
    } catch (error: any) {
      alert(error.message || 'Login failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRegister = async () => {
    setActionLoading('register')
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          name: registerName,
        }),
      })

      const data = await response.json()
      if (data.success) {
        localStorage.setItem('authToken', data.token)
        setToken(data.token)
        setUser(data.user)
      } else {
        alert(data.error || 'Registration failed')
      }
    } catch (error: any) {
      alert(error.message || 'Registration failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    setToken(null)
    setUser(null)
    setBooks([])
  }

  const handleCreateBook = async () => {
    setActionLoading('create-book')
    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBook),
      })

      const data = await response.json()
      if (data.success) {
        setBooks([data.book, ...books])
        // Reset form
        setNewBook({
          title: '',
          category: 'EBOOK',
          pageCount: 75,
          systemPrompt: '',
          userPrompt: '',
          imageStyle: 'pixar',
          coloringTheme: 'Mandalas',
          authorStyle: '',
          hasAudio: false,
        })
        alert('Book created successfully!')
      } else {
        alert(data.error || 'Failed to create book')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to create book')
    } finally {
      setActionLoading(null)
    }
  }

  const handleGenerateBook = async (bookId: string) => {
    setActionLoading(`generate-${bookId}`)
    try {
      const response = await fetch(`/api/books/${bookId}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        alert('Book generation started! This may take a few minutes.')
        loadBooks()
      } else {
        alert(data.error || 'Failed to start generation')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to start generation')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpgradePlan = async (planName: string) => {
    setActionLoading(`upgrade-${planName}`)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planName }),
      })

      const data = await response.json()
      if (data.success) {
        alert(data.message || 'Upgrade successful!')
        loadUser(token!)
      } else {
        alert(data.error || 'Upgrade failed')
      }
    } catch (error: any) {
      alert(error.message || 'Upgrade failed')
    } finally {
      setActionLoading(null)
    }
  }

  const getCategoryConfig = (category: BookCategory) => BOOK_CATEGORIES[category]

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
      generating: { label: 'Generating', color: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
      partial: { label: 'Partial', color: 'bg-yellow-100 text-yellow-800' },
      failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
    }

    const config = statusConfig[status] || statusConfig.draft
    return <Badge className={config.color}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    // Authentication Screen
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Book Generator Platform</h1>
            <p className="text-muted-foreground">Create amazing books with AI</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>Enter your credentials to access your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input
                      type="password"
                      placeholder="•••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleLogin}
                    disabled={actionLoading === 'login'}
                    className="w-full"
                  >
                    {actionLoading === 'login' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Login
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>Join us to start creating books</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      placeholder="Your name"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input
                      type="password"
                      placeholder="•••••••••"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleRegister}
                    disabled={actionLoading === 'register'}
                    className="w-full"
                  >
                    {actionLoading === 'register' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Create Account
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Book Generator</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={user.membershipType === 'premium' ? 'default' : 'secondary'}>
              <Crown className="h-3 w-3 mr-1" />
              {user.membershipType}
            </Badge>
            <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="books" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="books">My Books</TabsTrigger>
            <TabsTrigger value="create">Create Book</TabsTrigger>
            <TabsTrigger value="pricing">Plans</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          {/* My Books Tab */}
          <TabsContent value="books" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">My Books</h2>
                <p className="text-muted-foreground">
                  Manage your book projects
                </p>
              </div>
              <Button onClick={loadBooks} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {books.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No books yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first book to get started
                  </p>
                  <Button onClick={() => setNewBook({ ...newBook, category: 'EBOOK' })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Book
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {books.map((book) => {
                  const config = getCategoryConfig(book.category as BookCategory)
                  return (
                    <Card key={book.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          {getStatusBadge(book.status)}
                        </div>
                        <CardTitle className="line-clamp-1">{book.title}</CardTitle>
                        <CardDescription>
                          {config?.name} • {book.pageCount} pages
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-1">
                          {config?.features.slice(0, 2).map((feature) => (
                            <Badge key={feature} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          {book.status === 'draft' && (
                            <Button
                              onClick={() => handleGenerateBook(book.id)}
                              disabled={actionLoading?.startsWith(`generate-${book.id}`)}
                              className="flex-1"
                            >
                              {actionLoading === `generate-${book.id}` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="mr-2 h-4 w-4" />
                              )}
                              Generate
                            </Button>
                          )}
                          {book.status === 'completed' && (
                            <Button variant="outline" className="flex-1">
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Create Book Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Book</CardTitle>
                <CardDescription>
                  Choose a category and configure your book
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Book Title *</label>
                  <Input
                    placeholder="Enter your book title..."
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category *</label>
                  <div className="grid gap-3 md:grid-cols-2">
                    {Object.values(BOOK_CATEGORIES).map((category) => (
                      <Card
                        key={category.id}
                        className={`cursor-pointer transition-colors ${
                          newBook.category === category.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setNewBook({ ...newBook, category: category.id })}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {category.id === 'KIDS_STORY' && <ImageIcon className="h-4 w-4" />}
                              {category.id === 'COLORING_BOOK' && <Palette className="h-4 w-4" />}
                              {category.id === 'EBOOK' && <FileText className="h-4 w-4" />}
                              {category.id === 'NOVEL' && <BookOpen className="h-4 w-4" />}
                              {category.id === 'BLANK_NOTEBOOK' && <BookOpen className="h-4 w-4" />}
                              {category.id === 'AUDIO_BOOK' && <Mic className="h-4 w-4" />}
                              <span className="font-medium">{category.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {category.description}
                            </p>
                            <p className="text-xs">
                              <span className="font-medium">Pages:</span>{' '}
                              {category.minPages === category.maxPages
                                ? `${category.minPages}`
                                : `${category.minPages}-${category.maxPages}`}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {newBook.category && (
                  <div className="space-y-4">
                    {/* Page Count Slider */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Page Count: {newBook.pageCount}
                      </label>
                      <Input
                        type="range"
                        min={getCategoryConfig(newBook.category)?.minPages}
                        max={getCategoryConfig(newBook.category)?.maxPages}
                        value={newBook.pageCount}
                        onChange={(e) =>
                          setNewBook({ ...newBook, pageCount: parseInt(e.target.value) })
                        }
                      />
                    </div>

                    {/* Image Style for Kids Story & Coloring */}
                    {(newBook.category === 'KIDS_STORY' ||
                      newBook.category === 'COLORING_BOOK') && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Image Style</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {IMAGE_STYLES.map((style) => (
                            <Button
                              key={style.id}
                              variant={
                                newBook.imageStyle === style.id ? 'default' : 'outline'
                              }
                              size="sm"
                              onClick={() => setNewBook({ ...newBook, imageStyle: style.id })}
                            >
                              {style.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Coloring Theme for Coloring Books */}
                    {newBook.category === 'COLORING_BOOK' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Coloring Theme</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {COLORING_THEMES.map((theme) => (
                            <Button
                              key={theme}
                              variant={
                                newBook.coloringTheme === theme ? 'default' : 'outline'
                              }
                              size="sm"
                              onClick={() => setNewBook({ ...newBook, coloringTheme: theme })}
                            >
                              {theme}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Style Adaptation for Novels */}
                    {newBook.category === 'NOVEL' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="style-adaptation"
                          checked={newBook.styleAdaptation || false}
                          onChange={(e) =>
                            setNewBook({ ...newBook, styleAdaptation: e.target.checked })
                          }
                        />
                        <label htmlFor="style-adaptation" className="text-sm">
                          Enable AI style adaptation for literary tone
                        </label>
                      </div>
                    )}

                    {/* Author Writing Style */}
                    {(newBook.category === 'NOVEL' || newBook.category === 'EBOOK' || newBook.category === 'KIDS_STORY' || newBook.category === 'AUDIO_BOOK') && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Author Writing Style (Optional)</label>
                        <Input
                          placeholder="e.g., Hemingway, Dr. Seuss, JK Rowling..."
                          value={newBook.authorStyle}
                          onChange={(e) => setNewBook({ ...newBook, authorStyle: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Audio Generation Option */}
                    {newBook.category !== 'AUDIO_BOOK' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="has-audio"
                          checked={newBook.hasAudio || false}
                          onChange={(e) =>
                            setNewBook({ ...newBook, hasAudio: e.target.checked })
                          }
                        />
                        <label htmlFor="has-audio" className="text-sm">
                          Generate Audio Narration (TTS)
                        </label>
                      </div>
                    )}

                    {/* System Prompt */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        System Prompt (Optional)
                      </label>
                      <Textarea
                        placeholder="Define AI's behavior..."
                        value={newBook.systemPrompt}
                        onChange={(e) =>
                          setNewBook({ ...newBook, systemPrompt: e.target.value })
                        }
                        rows={2}
                      />
                    </div>

                    {/* User Prompt */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Content Instructions (Optional)
                      </label>
                      <Textarea
                        placeholder="Instructions for content generation..."
                        value={newBook.userPrompt}
                        onChange={(e) =>
                          setNewBook({ ...newBook, userPrompt: e.target.value })
                        }
                        rows={2}
                      />
                    </div>

                    <Button
                      onClick={handleCreateBook}
                      disabled={actionLoading === 'create-book' || !newBook.title}
                      className="w-full"
                    >
                      {actionLoading === 'create-book' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      <Plus className="mr-2 h-4 w-4" />
                      Create Book
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
              <p className="text-muted-foreground">
                Upgrade to unlock more features
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {pricingPlans.map((plan) => (
                <Card
                  key={plan.name}
                  className={`relative ${
                    user.membershipType === plan.name
                      ? 'border-primary ring-2 ring-primary'
                      : ''
                  }`}
                >
                  {user.membershipType === plan.name && (
                    <Badge className="absolute top-2 right-2">Current</Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="capitalize">{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        ${plan.price.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">
                        /{plan.interval}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          Up to {plan.maxBooks === 999 ? 'Unlimited' : plan.maxBooks} books
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          Up to {plan.maxPagesPerBook} pages per book
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {plan.imageGeneration ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm">Image generation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {plan.premiumTemplates ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm">Premium templates</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm capitalize">
                          {plan.supportLevel} support
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleUpgradePlan(plan.name)}
                      disabled={
                        actionLoading?.startsWith(`upgrade-${plan.name}`) ||
                        user.membershipType === plan.name
                      }
                      className="w-full"
                    >
                      {actionLoading === `upgrade-${plan.name}` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                      )}
                      {user.membershipType === plan.name ? 'Current Plan' : 'Upgrade'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Admin Tab */}
          <TabsContent value="admin" className="space-y-6">
            {user.role === 'admin' ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    You have admin access. Full admin panel coming soon.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle>Admin Dashboard</CardTitle>
                    <CardDescription>
                      Manage users, books, and system settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Admin features will be available in the next update</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have permission to access admin features
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
