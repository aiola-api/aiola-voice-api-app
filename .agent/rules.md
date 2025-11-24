# Agent Rules for VAP (Voice API App)

## Documentation Requirements

### 1. Always Update APP_FUNCTIONALITY.md
**CRITICAL**: Whenever you make changes to the codebase, you MUST update `APP_FUNCTIONALITY.md` to reflect:
- New features or components added
- Modified functionality or behavior
- Changes to the architecture or state management
- New hooks, utilities, or services
- Updates to the development workflow

**When to Update**:
- After adding a new component → Document it in the "Core Components" section
- After modifying state management → Update the "State Management" section
- After changing the chat message types → Update the "Chat Interface" section
- After adding new features → Add to the "Feature List" section
- After changing build/dev processes → Update "Development Setup"

### 2. Documentation Format
- Keep documentation clear, concise, and up-to-date
- Use bullet points for readability
- Include code examples where helpful
- Document both "what" and "why" for complex changes

## Code Quality Standards

### 3. TypeScript Best Practices
- Always use TypeScript types, never use `any`
- Define interfaces for component props
- Use type guards for runtime type checking
- Export types that may be reused

### 4. Component Structure
- Follow the existing component organization:
  - `src/components/chat/` - Chat-related UI components
  - `src/components/voice/` - Voice control components
  - `src/components/settings/` - Configuration components
  - `src/components/ui/` - Reusable UI primitives
- Each component should have its own CSS file using the same naming convention
- Use the `componentClassName` utility for consistent class naming

### 5. State Management (Recoil)
- Use Recoil atoms for global state
- Keep state minimal and normalized
- Use selectors for derived state
- Document state shape in comments
- Never mutate state directly - always use setters

### 6. Styling Guidelines
- Use the existing CSS class naming convention: `component-name__element-name--modifier`
- Match existing design patterns (colors, spacing, typography)
- Ensure dark mode support using `@media (prefers-color-scheme: dark)`
- Keep styles modular - one CSS file per component
- Use CSS variables for colors when possible

### 7. Naming Conventions
- Components: PascalCase (e.g., `VoiceControls.tsx`)
- Hooks: camelCase with "use" prefix (e.g., `useSTT.ts`)
- CSS files: Match component name (e.g., `VoiceControls.css`)
- State atoms: camelCase with "State" suffix (e.g., `conversationState`)
- Utility functions: camelCase (e.g., `componentClassName`)

## Development Workflow

### 8. Testing Changes
- Always verify changes in the browser at `http://localhost:3000`
- Test both light and dark modes
- Test responsive behavior if applicable
- Verify microphone functionality still works after changes
- Check that settings persist correctly

### 9. Build Verification
- Run `npm run build` to ensure production builds work
- Check for TypeScript errors with `npm run lint`
- Verify no console errors in the browser

### 10. Git Hygiene
- Make atomic commits (one logical change per commit)
- Write clear commit messages describing the change
- Don't commit generated files (build artifacts, node_modules)

## Feature Development

### 11. Adding New Message Types
When adding a new chat message type:
1. Define the type in `src/state/conversation.ts`
2. Update the `ChatMessage` union type
3. Create a new message component in `src/components/chat/`
4. Update `ChatMessageList.tsx` to render the new type
5. **Update APP_FUNCTIONALITY.md** with the new message type documentation

### 12. Adding New Settings
When adding new configuration options:
1. Update `src/state/settings.ts` with the new setting
2. Add UI controls in `ConfigDialog.tsx`
3. Implement validation if needed
4. Ensure localStorage persistence works
5. **Update APP_FUNCTIONALITY.md** in the "Configuration Management" section

### 13. Adding New Hooks
When creating custom hooks:
1. Place in `src/hooks/` directory
2. Follow the naming convention: `use[Feature].ts`
3. Document parameters and return values with JSDoc
4. Handle cleanup properly (return cleanup function)
5. **Update APP_FUNCTIONALITY.md** in the "Hooks" section

### 14. SDK Integration
- Use the existing SDK patterns from `useSTT` and `useTTS`
- Handle connection states properly (idle, connecting, connected, error)
- Implement proper error handling and user feedback
- Clean up resources on unmount

## Performance Considerations

### 15. Lazy Loading
- Use `React.lazy()` for heavy components (already done for main components)
- Provide suspense fallbacks
- Don't lazy load critical path components

### 16. Optimization
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback` when passing to child components
- Avoid unnecessary re-renders
- Use proper React keys in lists

## Error Handling

### 17. User Feedback
- Show toast notifications for errors using `sonner`
- Provide clear, actionable error messages
- Handle microphone permission denials gracefully
- Validate user input before processing

### 18. Logging
- Use `console.log` for debugging (with emoji prefixes for readability)
- Use `console.error` for actual errors
- Remove debug logs before committing (or use a debug flag)

## Security & Privacy

### 19. API Keys
- Never hardcode API keys
- Store in settings state (user-provided)
- Don't log API keys to console
- Clear sensitive data on logout/reset

### 20. Audio Data
- Handle microphone streams responsibly
- Stop streams when not in use
- Clean up audio resources properly

## Accessibility

### 21. A11y Requirements
- Use semantic HTML elements
- Provide ARIA labels for icon-only buttons
- Ensure keyboard navigation works
- Maintain sufficient color contrast
- Test with screen readers when possible

## Project-Specific Rules

### 22. Voice Controls
- Always update microphone state through the audio state atom
- Handle all microphone states: idle, ready, connecting, preparingMic, connected
- Provide visual feedback for each state
- Clean up audio streams on component unmount

### 23. Chat Messages
- Each message must have a unique `id`
- Include `conversation_session_id` for grouping related messages
- Set appropriate `status` (processing, done, error)
- Use the correct `kind` for message type routing

### 24. Environment Management
- Support all three environments: Production, Development, Custom
- Validate environment-specific settings
- Handle environment switching without breaking active connections
- Persist environment selection

## Summary Checklist

Before completing any task, ensure you have:
- [ ] Updated `APP_FUNCTIONALITY.md` with relevant changes
- [ ] Followed TypeScript best practices
- [ ] Maintained consistent styling and naming conventions
- [ ] Tested changes in the browser
- [ ] Verified build succeeds
- [ ] Handled errors gracefully
- [ ] Provided user feedback where appropriate
- [ ] Cleaned up resources properly
- [ ] Documented complex logic with comments
- [ ] Maintained accessibility standards
