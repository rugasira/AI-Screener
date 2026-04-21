import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Lock, 
  Monitor, 
  Shield, 
  Bell, 
  History, 
  ChevronRight, 
  LogOut, 
  Smartphone, 
  Globe,
  Mail,
  MoreVertical,
  UserPlus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [admins, setAdmins] = useState([
    { id: '1', name: 'Alexis Ahishakiye', email: 'alexisahishakiye378@gmail.com', role: 'Super Admin', status: 'active' },
    { id: '2', name: 'Umurava Support', email: 'admin@umurava.africa', role: 'Support', status: 'active' },
  ]);

  const [sessions, setSessions] = useState([
    { id: 's1', device: 'MacBook Pro', browser: 'Chrome', location: 'Kigali, Rwanda', status: 'current', icon: Monitor },
    { id: 's2', device: 'iPhone 15', browser: 'Mobile Safari', location: 'Kigali, Rwanda', status: 'active', icon: Smartphone },
    { id: 's3', device: 'Windows Desktop', browser: 'Edge', location: 'Lagos, Nigeria', status: 'active', icon: Monitor },
  ]);

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    toast.success("Password updated successfully");
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const revokeAdmin = (id: string) => {
    setAdmins(prev => prev.filter(a => a.id !== id));
    toast.success("Admin access revoked");
  };

  const signOutDevice = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success("Device signed out successfully");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500 font-medium mt-1">Manage your admin account and system preferences.</p>
      </div>

      <Tabs defaultValue="account" className="space-y-8">
        <TabsList className="bg-slate-100 p-1 rounded-none h-14">
          <TabsTrigger value="account" className="rounded-none px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border data-[state=active]:border-slate-200">
            <User className="w-4 h-4 mr-2" />
            Admin Accounts
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-none px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border data-[state=active]:border-slate-200">
            <Shield className="w-4 h-4 mr-2" />
            Auth & Security
          </TabsTrigger>
          <TabsTrigger value="devices" className="rounded-none px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border data-[state=active]:border-slate-200">
            <Monitor className="w-4 h-4 mr-2" />
            Device Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xl font-black text-slate-900">Admin Management</h3>
              <p className="text-sm text-slate-500 font-medium">Add or manage users with administrative access.</p>
            </div>
            <Button className="bg-primary rounded-none font-bold shadow-none">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          </div>

          <Card className="border border-slate-100 shadow-none rounded-none overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto text-sans">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Admin User</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-none bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                              {admin.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{admin.name}</p>
                              <p className="text-xs text-slate-500 font-medium">{admin.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-none uppercase tracking-wider">
                            {admin.role}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-none bg-emerald-500" />
                            <span className="text-xs font-bold text-emerald-600 capitalize">{admin.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="icon" className="rounded-none">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            } />
                            <DropdownMenuContent align="end" className="rounded-none font-bold">
                              <DropdownMenuItem className="py-2 cursor-pointer">Edit Privileges</DropdownMenuItem>
                              <DropdownMenuItem className="py-2 cursor-pointer text-destructive focus:text-destructive" onClick={() => revokeAdmin(admin.id)}>Revoke Access</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border border-slate-100 shadow-none rounded-none overflow-hidden p-8 bg-white">
              <CardTitle className="text-2xl font-black mb-6 flex items-center gap-2 text-slate-900">
                <Lock className="w-6 h-6 text-primary" />
                Password Authentication
              </CardTitle>
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Current Password</Label>
                  <Input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-12 rounded-none focus:ring-primary/20 border-slate-200" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">New Password</Label>
                  <Input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 rounded-none focus:ring-primary/20 border-slate-200" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Confirm New Password</Label>
                  <Input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 rounded-none focus:ring-primary/20 border-slate-200" 
                  />
                </div>
                <Button type="submit" className="w-full h-12 bg-primary rounded-none font-black shadow-none mt-2">
                  Update Password
                </Button>
              </form>
            </Card>

            <div className="space-y-8">
              <Card className="border-0 shadow-none rounded-none p-8 bg-slate-900 text-white">
                <CardTitle className="text-xl font-black mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Two-Factor Authentication
                </CardTitle>
                <p className="text-slate-400 text-sm font-medium mb-6">
                  Add an extra layer of security to your admin account by requiring a code from your phone at login.
                </p>
                <Button variant="outline" className="w-full h-12 rounded-none border-white/20 hover:bg-white/10 text-white font-bold">
                  Enable 2FA
                </Button>
              </Card>

              <Card className="border border-slate-100 shadow-none rounded-none p-8 border-l-4 border-l-amber-400 bg-white">
                <CardTitle className="text-lg font-black mb-4 text-slate-900">Security Log</CardTitle>
                <div className="space-y-4">
                  {[
                    { event: 'Password changed', date: 'Oct 20, 2023', icon: Lock },
                    { event: 'Login from new device', date: 'Oct 15, 2023', icon: Globe },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-none bg-slate-100 flex items-center justify-center">
                        <log.icon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-grow">
                        <p className="text-sm font-bold text-slate-900">{log.event}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="link" className="mt-6 p-0 text-primary font-black uppercase text-[10px] tracking-widest px-0">
                  View Full History <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          <div className="mb-2">
            <h3 className="text-xl font-black text-slate-900">Authorized Devices</h3>
            <p className="text-sm text-slate-500 font-medium">Review and manage devices that are currently logged into your admin account.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sessions.map((session, idx) => (
              <Card key={idx} className="border border-slate-100 shadow-none rounded-none p-8 relative overflow-hidden bg-white">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "h-14 w-14 rounded-none flex items-center justify-center shrink-0",
                    session.status === 'current' ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                  )}>
                    <session.icon className="h-7 w-7" />
                  </div>
                  <div className="flex-grow space-y-1">
                    <div className="flex justify-between">
                      <h4 className="text-lg font-black text-slate-900">{session.device}</h4>
                      {session.status === 'current' && (
                        <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-none uppercase tracking-wider h-fit">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-600">{session.browser}</p>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400 pt-2">
                      <Globe className="h-3 w-3" />
                      {session.location}
                    </div>
                  </div>
                </div>
                {session.status !== 'current' && (
                  <div className="mt-8 pt-6 border-t border-slate-50 flex justify-end text-sans">
                    <Button variant="ghost" className="text-rose-500 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 rounded-none" onClick={() => signOutDevice(session.id)}>
                      Sign Out Device
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
