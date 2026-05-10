import React from 'react';
import { View, Text } from 'react-native';
import { format } from 'date-fns';

interface Props {
  businessName: string;
  edition?: string | number;
}

// Newspaper-style "today's edition" strip — masthead title, divider rules,
// and a date/edition byline. Lives at the top of dashboard / overview screens.
export function EditionStrip({ businessName, edition }: Props) {
  const today = new Date();
  const dateLabel = format(today, "EEEE, d MMMM yyyy");
  const issueLabel = edition != null ? `No. ${edition}` : format(today, "yyyy.MM.dd");
  const titleUpper = (businessName || 'My Trading').toUpperCase();

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${titleUpper} Daily, ${dateLabel}, edition ${issueLabel}`}
      style={{
        backgroundColor: '#fdfcf8',
        borderBottomWidth: 2,
        borderBottomColor: '#1c1917',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 8,
      }}
    >
      {/* Top hairline rule */}
      <View style={{ height: 1, backgroundColor: '#1c1917', marginBottom: 6 }} />

      {/* Masthead title */}
      <Text
        style={{
          fontFamily: 'Georgia',
          fontSize: 22,
          fontWeight: '900',
          color: '#1c1917',
          textAlign: 'center',
          letterSpacing: 1.5,
        }}
        numberOfLines={1}
      >
        THE {titleUpper} DAILY
      </Text>

      {/* Byline row: date · issue */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#a8a29e',
      }}>
        <Text style={{ fontSize: 10, color: '#57534e', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {dateLabel}
        </Text>
        <Text style={{ fontSize: 10, color: '#57534e', fontWeight: '600', letterSpacing: 0.5 }}>
          Edition {issueLabel}
        </Text>
      </View>
    </View>
  );
}
