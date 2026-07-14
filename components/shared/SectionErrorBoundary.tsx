import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  /** Short name for diagnostics, e.g. "weather-forecast". Never user data. */
  section: string;
  /** What the fallback should call the broken content. */
  label: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Section-level error boundary — secondary protection so an unexpected
 * render failure in non-essential content (weather, forecast, daily
 * takings) degrades to a contained fallback instead of force-closing
 * the whole event screen.
 *
 * Root causes still get fixed at source; this exists because a
 * production React Native app hard-crashes on ANY uncaught render error
 * and event detail composes many data-driven sections.
 *
 * Styling is intentionally self-contained (no theme hook): a broken
 * theme context must not break the boundary itself.
 */
export class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (__DEV__) {
      // Sanitised: error type + section only — never event or financial data.
      // eslint-disable-next-line no-console
      console.warn(`[SectionErrorBoundary] ${this.props.section}: ${error.name} — ${error.message}`);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={{
        borderWidth: 1, borderColor: '#b8a577', backgroundColor: 'rgba(180,83,9,0.06)',
        padding: 14, gap: 6,
      }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b4a2e' }}>
          {this.props.label} couldn't be shown
        </Text>
        <Text style={{ fontSize: 12, color: '#6b4a2e', lineHeight: 17 }}>
          Something went wrong displaying this section. The rest of the event is unaffected.
        </Text>
        <TouchableOpacity
          onPress={() => this.setState({ hasError: false })}
          accessibilityRole="button"
          accessibilityLabel={`Retry loading ${this.props.label}`}
          style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: '#6b4a2e', paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b4a2e' }}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
