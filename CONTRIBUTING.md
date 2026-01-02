# Contributing to AlgoGate

Thank you for your interest in contributing to AlgoGate! This document provides guidelines for contributing to the project.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Steps to reproduce the problem
- Expected behavior vs actual behavior
- Screenshots if applicable
- Browser version and operating system
- Extension version

### Suggesting Features

Feature suggestions are welcome! Please open an issue with:
- A clear description of the feature
- Why this feature would be useful
- Any examples or mockups if applicable

### Submitting Pull Requests

1. Fork the repository
2. Create a new branch for your feature/fix
3. Make your changes
4. Test your changes thoroughly (see TESTING.md)
5. Commit with clear, descriptive messages
6. Push to your fork
7. Open a pull request

## Development Setup

1. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/algogate.git
   cd algogate
   ```

2. Load the extension in your browser:
   - Chrome: Navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `algogate` directory

3. Make changes to the code

4. Reload the extension to test changes:
   - Click the refresh icon on the extension card
   - Or disable and re-enable the extension

## Code Style

### JavaScript
- Use modern ES6+ syntax
- Use `const` and `let` instead of `var`
- Use arrow functions where appropriate
- Add comments for complex logic
- Use meaningful variable names
- Keep functions focused and small

### HTML/CSS
- Use semantic HTML5 elements
- Follow BEM naming convention for CSS classes where applicable
- Keep CSS organized and commented
- Use modern CSS features (flexbox, grid)

### Commit Messages
- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issues and pull requests after the first line

Example:
```
Add grace period notification sound

- Play a subtle sound when grace period starts
- Add setting to enable/disable sounds
- Fixes #123
```

## File Structure

```
algogate/
├── manifest.json           # Extension manifest
├── background.js           # Service worker
├── leetcode-detector.js    # LeetCode problem detection
├── blocker.js             # Site blocking logic
├── popup.html             # Popup UI structure
├── popup.js               # Popup UI logic
├── popup.css              # Popup UI styles
├── icons/                 # Extension icons
├── README.md              # Main documentation
├── TESTING.md             # Testing guide
└── CONTRIBUTING.md        # This file
```

## Testing

Before submitting a pull request:
1. Test all affected functionality
2. Test on at least one Chromium-based browser
3. Check browser console for errors
4. Verify no console warnings
5. Test with extension enabled and disabled
6. See TESTING.md for comprehensive test checklist

## Areas for Contribution

Good areas to contribute:
- **Better LeetCode detection**: Improve reliability of solution detection
- **More blocked sites**: Add support for more distracting sites
- **UI improvements**: Better designs, animations, feedback
- **Settings**: More configuration options
- **Statistics**: Better tracking and visualization
- **Internationalization**: Support for multiple languages
- **Dark mode**: Dark theme for popup
- **Keyboard shortcuts**: Add keyboard navigation
- **Export/import**: Settings backup and restore
- **Achievements**: Gamification features

## Questions?

If you have questions about contributing:
- Open an issue with the "question" label
- Check existing issues for answers
- Review the code and documentation

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Respect different perspectives and experiences

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
