import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Shield,
  Building,
  UserPlus,
  Edit2,
  Trash2,
  GraduationCap,
  Briefcase,
  UserCheck,
} from 'lucide-react';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  studentId?: string;
  departmentId?: string;
  createdAt: string;
  role: string;
}

interface Department {
  _id: string;
  name: string;
  code: string;
}

const AdminUsers: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [newDepartment, setNewDepartment] = useState<string>('');
  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.getUsers();
      if (!res.success) throw new Error(res.message || 'Failed to load users');
      setUsers((res.data || []) as UserProfile[]);
    } catch (error: any) {
      toast.error('Failed to fetch users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    const res = await api.getDepartments();
    if (res.success && res.data) {
      setDepartments(res.data as Department[]);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const res = await api.updateUser(userId, { role });
      if (!res.success) throw new Error(res.message || 'Failed to update role');

      toast.success('User role updated successfully');
      fetchUsers();
      setEditingUser(null);
    } catch (error: any) {
      toast.error('Failed to update role: ' + error.message);
    }
  };

  const updateUserDepartment = async (userId: string, departmentId: string) => {
    try {
      const res = await api.updateUser(userId, { departmentId });
      if (!res.success) throw new Error(res.message || 'Failed to update department');

      toast.success('Department updated successfully');
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to update department: ' + error.message);
    }
  };

  const createDepartment = async () => {
    if (!newDeptName || !newDeptCode) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const res = await api.createDepartment({ name: newDeptName, code: newDeptCode.toUpperCase() });
      if (!res.success) throw new Error(res.message || 'Failed to create department');

      toast.success('Department created successfully');
      setShowDeptDialog(false);
      setNewDeptName('');
      setNewDeptCode('');
      fetchDepartments();
    } catch (error: any) {
      toast.error('Failed to create department: ' + error.message);
    }
  };

  const deleteDepartment = async (id: string) => {
    try {
      const res = await api.deleteDepartment(id);
      if (!res.success) throw new Error(res.message || 'Failed to delete department');
      toast.success('Department deleted');
      fetchDepartments();
    } catch (error: any) {
      toast.error('Failed to delete department: ' + error.message);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4 text-destructive" />;
      case 'teacher':
        return <Briefcase className="w-4 h-4 text-primary" />;
      case 'parent':
        return <UserCheck className="w-4 h-4 text-warning" />;
      default:
        return <GraduationCap className="w-4 h-4 text-secondary" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'teacher':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'parent':
        return 'bg-warning/10 text-warning border-warning/30';
      default:
        return 'bg-secondary/10 text-secondary border-secondary/30';
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <h1 className="font-heading text-3xl font-bold">
            User <span className="gradient-text">Management</span>
          </h1>
          <p className="text-muted-foreground mt-1">Manage users, roles, and departments</p>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: users.length, icon: Users, color: 'gradient-primary' },
              { label: 'Students', value: users.filter(u => u.role === 'student').length, icon: GraduationCap, color: 'gradient-secondary' },
              { label: 'Teachers', value: users.filter(u => u.role === 'teacher').length, icon: Briefcase, color: 'gradient-accent' },
            { label: 'Departments', value: departments.length, icon: Building, color: 'bg-muted' },
          ].map((stat, i) => (
            <div key={i} className="stat-card animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <p className="text-2xl font-heading font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Departments Section */}
        <div className="glass-card rounded-2xl p-6 mb-8 animate-slide-up stagger-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading font-bold text-xl flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              Departments
            </h2>
            <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Department
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Department</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input
                    placeholder="Department Name"
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                  />
                  <Input
                    placeholder="Department Code (e.g., CSE)"
                    value={newDeptCode}
                    onChange={e => setNewDeptCode(e.target.value)}
                  />
                  <Button onClick={createDepartment} className="w-full">
                    Create Department
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-wrap gap-3">
            {departments.map(dept => (
              <div
                key={dept._id}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border"
              >
                <Building className="w-4 h-4 text-primary" />
                <span className="font-medium">{dept.name}</span>
                <span className="text-xs text-muted-foreground">({dept.code})</span>
                <button
                  onClick={() => deleteDepartment(dept._id)}
                  className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="glass-card rounded-2xl p-6 animate-slide-up stagger-2">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
                <SelectItem value="parent">Parents</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Loading users...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(u => (
                    <TableRow key={u._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClass(u.role || 'student')}`}>
                          {getRoleIcon(u.role || 'student')}
                          {u.role || 'student'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.departmentId || ''}
                          onValueChange={val => updateUserDepartment(u._id, val)}
                        >
                          <SelectTrigger className="w-[160px] h-8 text-xs">
                            <SelectValue placeholder="Assign department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(d => (
                              <SelectItem key={d._id} value={d._id}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{u.studentId || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingUser(u);
                                setNewRole(u.role || 'student');
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change User Role</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium">{u.name}</p>
                                  <p className="text-sm text-muted-foreground">{u.email}</p>
                                </div>
                              </div>
                              <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="student">Student</SelectItem>
                                  <SelectItem value="teacher">Teacher</SelectItem>
                                  <SelectItem value="parent">Parent</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => updateUserRole(u._id, newRole)}
                                className="w-full"
                              >
                                Update Role
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminUsers;
