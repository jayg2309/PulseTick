import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Settings, LogOut, Clock, Users, Search } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useGroupStore } from "@/store/groupStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CreateGroupDialog } from "@/components/groups/CreateGroupDialog";
import { JoinGroupDialog } from "@/components/groups/JoinGroupDialog";
import { formatExpiryTime } from "@/lib/utils";
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div role="alert" className="p-4 bg-destructive/10 rounded-lg m-4">
      <p className="text-destructive font-medium">Something went wrong:</p>
      <pre className="text-sm mt-2 mb-4 overflow-auto">{error.message}</pre>
      <button 
        onClick={resetErrorBoundary}
        className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}

function DashboardContent() {
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const { user, logout } = useAuthStore();
  const { groups, isLoading, loadGroups } = useGroupStore();

  useEffect(() => {
    loadGroups().catch(console.error);
  }, [loadGroups]);

  const groupList = Object.values(groups);

  const filteredGroups = groupList.filter(
    (group: any) =>
      group?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group?.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGroupClick = (groupId: string) => {
    navigate(`/chat/${groupId}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-primary">PulseTick</h1>
            <div className="hidden md:block text-sm text-muted-foreground">
              Welcome{user?.username ? `, ${user.username}` : ''}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/settings")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateGroup(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
            <Button variant="outline" onClick={() => setShowJoinGroup(true)}>
              Join Group
            </Button>
          </div>
        </div>

        {/* Groups List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group: any) => (
            <Card
              key={group._id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleGroupClick(group._id)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-1" />
                    <span>{group.memberCount || 0}</span>
                  </div>
                </div>
                {group.description && (
                  <CardDescription>{group.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {group.messageCount || 0} messages
                  </span>
                  {group.expiresAt && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatExpiryTime(new Date(group.expiresAt).getTime() - Date.now())}
                      </span>
                    </div>
                  )}
                </div>
                {group.lastMessage && (
                  <div className="mt-2 text-sm text-muted-foreground truncate">
                    <strong>{group.lastMessage.sender?.username || 'System'}:</strong>{' '}
                    {group.lastMessage.content}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredGroups.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium">No groups found</h3>
            <p className="text-muted-foreground mt-2">
              Create a new group or join an existing one to get started.
            </p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
      />
      <JoinGroupDialog
        open={showJoinGroup}
        onOpenChange={setShowJoinGroup}
      />
    </div>
  );
}

export function DashboardPage() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <DashboardContent />
    </ErrorBoundary>
  );
}
