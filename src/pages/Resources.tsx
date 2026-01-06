import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  FileText, 
  Download, 
  Star, 
  Upload,
  Plus,
  Loader2,
  Eye,
  TrendingUp,
  Award,
  Edit2
} from 'lucide-react';
import { format } from 'date-fns';

interface Resource {
  _id: string;
  title: string;
  description?: string;
  course_id?: {
    _id: string;
    name: string;
    code: string;
  };
  type: 'document' | 'video' | 'link' | 'presentation' | 'other';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  uploaded_by?: {
    _id: string;
    name: string;
  };
  views?: number;
  average_rating?: number;
  rating_count?: number;
  created_at: string;
}

interface ResourceRating {
  _id: string;
  resource_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

const Resources: React.FC = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [filterCourse, setFilterCourse] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    course_id: '',
    type: 'document' as Resource['type'],
    file: null as File | null,
    url: ''
  });

  const [ratingForm, setRatingForm] = useState({
    rating: 5,
    comment: ''
  });

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    type: 'document' as Resource['type'],
    file_url: ''
  });

  useEffect(() => {
    if (user) {
      fetchResources();
      fetchCourses();
    }
  }, [user, filterCourse]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const result = await api.getResources();
      
      if (result.success && result.data) {
        let filtered = result.data;
        
        if (filterCourse !== 'all') {
          filtered = filtered.filter((r: any) => r.course_id?._id === filterCourse);
        }
        
        if (searchQuery) {
          filtered = filtered.filter((r: any) => 
            r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.description?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        setResources(filtered);
      } else {
        setResources([]);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Failed to load resources');
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const result = await api.getCourses();
      if (result.success && result.data) {
        setCourses(result.data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.title.trim()) {
      toast.error('Please enter a resource title');
      return;
    }

    if (!uploadForm.course_id) {
      toast.error('Please select a course');
      return;
    }

    if ((uploadForm.type === 'link' || uploadForm.type === 'video') && !uploadForm.url) {
      toast.error('Please provide a link URL');
      return;
    }

    if (uploadForm.type !== 'link' && uploadForm.type !== 'video' && !uploadForm.file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('course_id', uploadForm.course_id);
      formData.append('type', uploadForm.type);
      
      if (uploadForm.file) {
        formData.append('file', uploadForm.file);
      }
      if (uploadForm.url) {
        formData.append('file_url', uploadForm.url);
      }

      const result = await api.uploadResource(formData);

      if (result.success) {
        toast.success('Resource shared successfully!');
        setUploadDialogOpen(false);
        setUploadForm({ title: '', description: '', course_id: '', type: 'document', file: null, url: '' });
        fetchResources();
      } else {
        toast.error(result.message || 'Failed to upload resource');
      }
    } catch (error: any) {
      console.error('Error uploading resource:', error);
      toast.error(error.message || 'Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  const handleRate = async () => {
    if (!selectedResource) return;

    setUploading(true);
    try {
      const result = await api.rateResource(selectedResource._id, {
        rating: ratingForm.rating,
        comment: ratingForm.comment
      });

      if (result.success) {
        toast.success('Thank you for rating this resource!');
        setRatingDialogOpen(false);
        setRatingForm({ rating: 5, comment: '' });
        fetchResources();
      } else {
        toast.error(result.message || 'Failed to rate resource');
      }
    } catch (error: any) {
      console.error('Error rating resource:', error);
      toast.error(error.message || 'Failed to rate resource');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (resource: Resource) => {
    if (!resource.file_url) {
      toast.error('Download link not available');
      return;
    }

    try {
      setLoading(true);

      // Count a view when the user opens/downloads the resource
      await api.incrementResourceView(resource._id);
      
      // If it's a link type, just open it
      if (resource.type === 'link' || resource.file_url.startsWith('http')) {
        window.open(resource.file_url, '_blank');
        toast.success('Opening resource in new tab');
        return;
      }

      // For file downloads
      const result = await api.downloadResource(resource.file_url, resource.file_name || 'download');
      
      if (result.success) {
        toast.success('Download started');
      } else {
        toast.error(result.message || 'Failed to download');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (resource: Resource) => {
    setEditingResource(resource);
    setEditForm({
      title: resource.title || '',
      description: resource.description || '',
      type: resource.type,
      file_url: resource.file_url || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdateResource = async () => {
    if (!editingResource) return;
    if (!editForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if ((editForm.type === 'link' || editForm.type === 'video') && !editForm.file_url.trim()) {
      toast.error('Link URL is required');
      return;
    }

    setUploading(true);
    try {
      const payload: any = {
        title: editForm.title,
        description: editForm.description,
        type: editForm.type,
      };
      if (editForm.type === 'link' || editForm.type === 'video') {
        payload.file_url = editForm.file_url;
        payload.file_name = 'External Link';
      }

      const result = await api.updateResource(editingResource._id, payload);
      if (result.success) {
        toast.success('Resource updated');
        setEditDialogOpen(false);
        setEditingResource(null);
        fetchResources();
      } else {
        toast.error(result.message || 'Failed to update resource');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update resource');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      document: <FileText className="w-5 h-5 text-blue-500" />,
      video: <FileText className="w-5 h-5 text-red-500" />,
      link: <FileText className="w-5 h-5 text-green-500" />,
      presentation: <FileText className="w-5 h-5 text-orange-500" />,
      other: <FileText className="w-5 h-5 text-gray-500" />
    };
    return icons[type] || icons.other;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      document: 'bg-blue-100 text-blue-800',
      video: 'bg-red-100 text-red-800',
      link: 'bg-green-100 text-green-800',
      presentation: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold gradient-text">Learning Resources</h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === 'student' 
              ? 'Access course materials and share helpful resources'
              : 'Upload resources for your courses'}
          </p>
        </div>

        {(user?.role === 'teacher' || user?.role === 'student') && (
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                {user?.role === 'student' ? 'Share Resource' : 'Upload Resource'}
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card max-w-md">
              <DialogHeader>
                <DialogTitle>{user?.role === 'student' ? 'Share Resource' : 'Upload Resource'}</DialogTitle>
                <DialogDescription>
                  {user?.role === 'student' 
                    ? 'Share helpful links or documents with your classmates'
                    : 'Share learning materials with your students'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Resource Title</Label>
                  <Input
                    id="title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g., Chapter 5 Notes"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    placeholder="Describe the resource..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select
                    value={uploadForm.course_id}
                    onValueChange={(value) => setUploadForm({ ...uploadForm, course_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course._id} value={course._id}>
                          {course.code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Resource Type</Label>
                  <Select
                    value={uploadForm.type}
                    onValueChange={(value: any) => setUploadForm({ ...uploadForm, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Document (PDF, DOCX)</SelectItem>
                      <SelectItem value="presentation">Presentation (PPT, PPTX)</SelectItem>
                      <SelectItem value="video">Video Link</SelectItem>
                      <SelectItem value="link">External Link</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">
                    {uploadForm.type === 'link' || uploadForm.type === 'video' ? 'Link URL' : 'Upload File'}
                  </Label>
                  {uploadForm.type === 'link' || uploadForm.type === 'video' ? (
                    <Input
                      id="url"
                      type="url"
                      value={uploadForm.url}
                      onChange={(e) => setUploadForm({ ...uploadForm, url: e.target.value })}
                      placeholder="https://example.com/resource"
                    />
                  ) : (
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                    />
                  )}
                </div>

                <Button type="submit" className="w-full gradient-primary" disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {user?.role === 'student' ? 'Sharing...' : 'Uploading...'}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {user?.role === 'student' ? 'Share' : 'Upload'}
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter & Search */}
      <Card className="glass-card mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course._id} value={course._id}>
                    {course.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resources List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : resources.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-semibold mb-2">No resources found</p>
            <p className="text-sm text-muted-foreground">
              {user?.role === 'student' 
                ? 'Check back later for course materials'
                : 'Upload resources to share with your students'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {resources.map((resource) => (
            <Card key={resource._id} className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {getFileIcon(resource.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{resource.title}</h3>
                        {resource.description && (
                          <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                        )}
                      </div>
                      <Badge className={getTypeColor(resource.type)}>
                        {resource.type}
                      </Badge>
                    </div>

                    {/* Course & Teacher */}
                    {resource.course_id && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <span className="font-semibold">{resource.course_id.code}</span>
                        <span>•</span>
                        <span>{resource.course_id.name}</span>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      {resource.views !== undefined && (
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{resource.views} views</span>
                        </div>
                      )}
                      
                      {resource.average_rating !== undefined && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span>
                            {resource.average_rating.toFixed(1)} ({resource.rating_count || 0} ratings)
                          </span>
                        </div>
                      )}

                      {resource.uploaded_by && (
                        <div className="flex items-center gap-1">
                          <span>By {resource.uploaded_by.name}</span>
                        </div>
                      )}

                      {resource.created_at && (
                        <div className="flex items-center gap-1">
                          <span>{format(new Date(resource.created_at), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {resource.file_url && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDownload(resource)}
                          disabled={loading}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {resource.type === 'link' ? 'Open' : 'Download'}
                        </Button>
                      )}

                      {(user?.role === 'teacher' || user?.role === 'admin') && (
                        <Button size="sm" variant="outline" onClick={() => openEdit(resource)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      )}

                      {user?.role === 'student' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedResource(resource);
                            setRatingDialogOpen(true);
                          }}
                        >
                          <Star className="w-4 h-4 mr-2" />
                          Rate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="glass-card max-w-sm">
          <DialogHeader>
            <DialogTitle>Rate Resource</DialogTitle>
            <DialogDescription>
              {selectedResource?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setRatingForm({ ...ratingForm, rating })}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      rating <= ratingForm.rating ? 'text-yellow-500' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Comment (Optional)</Label>
              <Textarea
                id="comment"
                value={ratingForm.comment}
                onChange={(e) => setRatingForm({ ...ratingForm, comment: e.target.value })}
                placeholder="Share your thoughts about this resource..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setRatingDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRate}
                disabled={uploading}
                className="flex-1 gradient-primary"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Rating'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle>Update Resource</DialogTitle>
            <DialogDescription>
              Edit title, notes, and (for links) the URL
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Resource title"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Short description / notes"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={editForm.type}
                onValueChange={(v) => setEditForm({ ...editForm, type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">document</SelectItem>
                  <SelectItem value="presentation">presentation</SelectItem>
                  <SelectItem value="link">link</SelectItem>
                  <SelectItem value="video">video</SelectItem>
                  <SelectItem value="other">other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(editForm.type === 'link' || editForm.type === 'video') && (
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={editForm.file_url}
                  onChange={(e) => setEditForm({ ...editForm, file_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1 gradient-primary" onClick={handleUpdateResource} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Resources;
