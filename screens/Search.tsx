import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, Alert } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { bibleDB } from "../lib/database";
import { VerseCard } from "../components/VerseCard";
import { Verse } from "../types";

type SearchScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Search"
>;

interface Props {
  navigation: SearchScreenNavigationProp;
}

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Verse[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setSearching(true);
      const searchResults = await bibleDB.searchVerses(query);
      setResults(searchResults);
    } catch (error) {
      Alert.alert("Error", "Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4">
        <TextInput
          className="bg-white p-4 rounded-lg shadow-sm mb-4"
          placeholder="Search Bible verses..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />

        {searching ? (
          <Text className="text-center text-gray-600">Searching...</Text>
        ) : (
          <ScrollView>
            <View className="space-y-3">
              {results.map((verse) => (
                <VerseCard key={verse.id} verse={verse} />
              ))}
            </View>

            {results.length === 0 && query && (
              <Text className="text-center text-gray-600 mt-4">
                No results found for "{query}"
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
