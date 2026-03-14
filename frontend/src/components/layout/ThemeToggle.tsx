import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/button'

// ThemeToggle renders a button that cycles through Light → Dark → System theme modes.
export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme()

  const icon = theme === 'light' ? <Sun className="h-4 w-4" /> :
               theme === 'dark' ? <Moon className="h-4 w-4" /> :
               <Monitor className="h-4 w-4" />

  const label = theme === 'light' ? 'Light mode' :
                theme === 'dark' ? 'Dark mode' :
                'System mode'

  return (
    <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label={label} title={label}>
      {icon}
    </Button>
  )
}
