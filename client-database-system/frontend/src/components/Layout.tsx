import React from 'react'
import { AppBar, Toolbar, Typography, Container, Box, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, useTheme, useMediaQuery } from '@mui/material'
import { Menu as MenuIcon, Dashboard as DashboardIcon, PhotoLibrary as PhotoLibraryIcon, AdminPanelSettings as AdminIcon, Logout as LogoutIcon, MenuBook as MenuBookIcon } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'My Items', icon: <PhotoLibraryIcon />, path: '/dashboard' },
  ]

  const adminItems = [
    { text: 'Admin Panel', icon: <AdminIcon />, path: '/admin' },
    { text: 'Photo Upload', icon: <MenuBookIcon />, path: '/upload' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigateTo = (path: string) => {
    navigate(path)
    if (isMobile) {
      setDrawerOpen(false)
    }
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Client Database System
          </Typography>
          
          <Typography variant="body2" sx={{ mr: 2 }}>
            Welcome, {user?.name}
          </Typography>
          
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Box sx={{ width: 250 }} role="presentation" onClick={() => setDrawerOpen(false)}>
            <List>
              {menuItems.map((item) => (
                <ListItem button key={item.text} onClick={() => navigateTo(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItem>
              ))}
              {user?.email === import.meta.env.VITE_ADMIN_EMAIL && (
                <>
                  {adminItems.map((item) => (
                    <ListItem button key={item.text} onClick={() => navigateTo(item.path)}>
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItem>
                  ))}
                </>
              )}
            </List>
          </Box>
        </Drawer>
      ) : (
        <Box sx={{ display: 'flex' }}>
          <AppBar position="static" sx={{ width: 240, mt: 1, ml: 1 }}>
            <List>
              {menuItems.map((item) => (
                <ListItem button key={item.text} onClick={() => navigateTo(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItem>
              ))}
              {user?.email === import.meta.env.VITE_ADMIN_EMAIL && (
                <>
                  <ListItem>
                    <ListItemText primary="Admin" sx={{ fontWeight: 'bold' }} />
                  </ListItem>
                  {adminItems.map((item) => (
                    <ListItem button key={item.text} onClick={() => navigateTo(item.path)}>
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItem>
                  ))}
                </>
              )}
            </List>
          </AppBar>
        </Box>
      )}

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ minHeight: 'calc(100vh - 200px)' }}>
          {children}
        </Box>
      </Container>

      <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: theme.palette.grey[200] }}>
        <Container maxWidth="xl">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Client Database System
          </Typography>
        </Container>
      </Box>
    </>
  )
}

export default Layout