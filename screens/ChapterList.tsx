import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { Book } from "../types";

type ChapterListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ChapterList"
>;
type ChapterListScreenRouteProp = RouteProp<RootStackParamList, "ChapterList">;

interface Props {
  navigation: ChapterListScreenNavigationProp;
  route: ChapterListScreenRouteProp;
}

export default function ChapterListScreen({ navigation, route }: Props) {
  const { book } = route.params;
  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <Text className="text-2xl font-bold text-primary mb-4 text-center">
          {book.name}
        </Text>
        <Text className="text-gray-600 mb-6 text-center">
          Select a chapter to read
        </Text>

        <View className="flex-row flex-wrap gap-3 justify-center">
          {chapters.map((chapter) => (
            <TouchableOpacity
              key={chapter}
              className="bg-white w-16 h-16 rounded-lg shadow-sm justify-center items-center"
              onPress={() =>
                navigation.navigate("VerseList", { book, chapter })
              }
            >
              <Text className="text-primary font-bold text-lg">{chapter}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
