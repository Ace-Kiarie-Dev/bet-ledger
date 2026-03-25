import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddBetScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Add Bet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#F5A623',
    fontSize: 24,
    fontWeight: 'bold',
  },
});