import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Book, ChapterInfo } from "../types";
import { lightenColor } from "../utils/colorUtils";

interface NavigationModalProps {
  visible: boolean;
  onClose: () => void;
  books: Book[];
  oldTestament: Book[];
  newTestament: Book[];
  chapters: ChapterInfo[];
  versesList: number[];
  selectedBook: Book | null;
  selectedChapter: number;
  selectedVerse: number | null;
  hasTappedChapter: boolean;
  isLoadingNavigation: boolean;
  isLoadingChapters: boolean;
  modalScrollViewRef: any;
  chaptersSectionRef: any;
  versesSectionRef: any;
  handleBookSelect: (book: Book) => void;
  handleChapterSelect: (chapter: number) => void;
  handleVerseSelect: (verse: number) => void;
  handleNavigateToLocation: () => void;
  colors: any;
  primaryTextColor: string;
}

export const NavigationModal: React.FC<NavigationModalProps> = ({
  visible,
  onClose,
  books,
  oldTestament,
  newTestament,
  chapters,
  versesList,
  selectedBook,
  selectedChapter,
  selectedVerse,
  hasTappedChapter,
  isLoadingNavigation,
  isLoadingChapters,
  modalScrollViewRef,
  chaptersSectionRef,
  versesSectionRef,
  handleBookSelect,
  handleChapterSelect,
  handleVerseSelect,
  handleNavigateToLocation,
  colors,
  primaryTextColor,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }}>
      <View
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}
      >
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={onClose} className="p-2">
            <Ionicons name="arrow-back" size={24} color={primaryTextColor} />
          </TouchableOpacity>
          <Text
            style={{
              color: primaryTextColor,
              fontWeight: "bold",
              fontSize: 18,
            }}
          >
            Choose Passage to Read
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>
      <ScrollView
        ref={modalScrollViewRef}
        className="flex-1 p-4"
        showsVerticalScrollIndicator
        style={{ backgroundColor: colors.background?.default }}
      >
        {isLoadingNavigation && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.card + "80",
              zIndex: 10,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.text?.primary, marginTop: 8 }}>
              Loading books...
            </Text>
          </View>
        )}
        <View className="mb-6">
          <Text
            style={{
              color: colors.text?.primary,
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 12,
            }}
          >
            Select Book
          </Text>
          {oldTestament.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 20,
                    fontWeight: "bold",
                  }}
                >
                  Old Testament
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {oldTestament.length} books
                </Text>
              </View>
              <View className="flex-row flex-wrap justify-between">
                {oldTestament.map((book) => (
                  <TouchableOpacity
                    key={book.book_number}
                    onPress={() => handleBookSelect(book)}
                    className="p-3 rounded-lg shadow-sm mb-3 border-l-4"
                    style={{
                      width: "15%",
                      borderLeftColor: book.book_color || "#DC2626",
                      backgroundColor:
                        lightenColor(book.book_color || "#DC2626", 0.15) ||
                        colors.card,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text?.primary,
                        fontWeight: "600",
                        textAlign: "center",
                        fontSize: 12,
                      }}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {book.short_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          {newTestament.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 20,
                    fontWeight: "bold",
                  }}
                >
                  New Testament
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {newTestament.length} books
                </Text>
              </View>
              <View className="flex-row flex-wrap justify-between">
                {newTestament.map((book) => (
                  <TouchableOpacity
                    key={book.book_number}
                    onPress={() => handleBookSelect(book)}
                    className="p-3 rounded-lg shadow-sm mb-3 border-l-4"
                    style={{
                      width: "15%",
                      borderLeftColor: book.book_color || "#059669",
                      backgroundColor:
                        lightenColor(book.book_color || "#059669", 0.15) ||
                        colors.card,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text?.primary,
                        fontWeight: "600",
                        textAlign: "center",
                        fontSize: 12,
                      }}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {book.short_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
        <View
          style={{
            backgroundColor: colors.background?.highlight,
            borderRadius: 8,
            padding: 8,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border?.highlight,
          }}
        >
          <Text
            style={{
              color: colors.text?.primary,
              fontWeight: "600",
              textAlign: "center",
              fontSize: 16,
            }}
          >
            {selectedBook
              ? `${selectedBook.long_name} ${selectedChapter}${selectedVerse ? `:${selectedVerse}` : ""}`
              : "Select a book"}
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              textAlign: "center",
              marginTop: 4,
            }}
          >
            {selectedBook
              ? `${chapters.length} ${chapters.length > 1 ? "chapters available" : "chapter available"}`
              : ""}
          </Text>
        </View>
        {selectedBook && chapters.length > 0 && (
          <View ref={chaptersSectionRef} className="mb-6">
            <Text
              style={{
                color: colors.text?.primary,
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 12,
              }}
            >
              Select Chapter
            </Text>
            {isLoadingChapters ? (
              <View className="flex-row justify-center py-4">
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-2 justify-center">
                {chapters.map((chapterInfo) => (
                  <TouchableOpacity
                    key={chapterInfo.chapter}
                    onPress={() => handleChapterSelect(chapterInfo.chapter)}
                    className={`rounded-lg border items-center justify-center ${selectedChapter === chapterInfo.chapter ? "bg-primary border-primary" : "bg-card border-border"}`}
                    style={{ width: 40, height: 40 }}
                  >
                    <Text
                      style={{
                        fontWeight: "bold",
                        fontSize: 12,
                        color:
                          selectedChapter === chapterInfo.chapter
                            ? primaryTextColor
                            : colors.primary,
                      }}
                    >
                      {chapterInfo.chapter}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color:
                          selectedChapter === chapterInfo.chapter
                            ? primaryTextColor + "80"
                            : colors.muted,
                      }}
                    >
                      {chapterInfo.verseCount} v
                      {chapterInfo.verseCount !== 1 ? "s" : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        {!hasTappedChapter && (
          <View className="mb-6">
            <Text
              style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}
            >
              Choose a chapter to reveal verse selection
            </Text>
          </View>
        )}
        {hasTappedChapter &&
          selectedBook &&
          selectedChapter &&
          versesList.length > 0 && (
            <View ref={versesSectionRef} className="mb-6">
              <Text
                style={{
                  color: colors.text?.primary,
                  fontSize: 18,
                  fontWeight: "600",
                  marginBottom: 12,
                }}
              >
                Select Verse {selectedVerse && `- Selected: ${selectedVerse}`}
              </Text>
              <Text
                style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}
              >
                {selectedVerse
                  ? `Will navigate to ${selectedBook.long_name} ${selectedChapter}:${selectedVerse}`
                  : "Choose any verse to navigate directly"}
              </Text>
              <View className="flex-row flex-wrap gap-1">
                {versesList.map((verse) => (
                  <TouchableOpacity
                    key={verse}
                    onPress={() => handleVerseSelect(verse)}
                    className="size-10 rounded-lg border items-center justify-center bg-card border-primary"
                  >
                    <Text
                      style={{
                        color: colors.text?.primary,
                        fontSize: 12,
                        fontWeight: "500",
                      }}
                    >
                      {verse}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        <TouchableOpacity
          onPress={handleNavigateToLocation}
          disabled={!selectedBook || isLoadingNavigation}
          className={`p-4 rounded-lg mt-4 mb-20 ${selectedBook && !isLoadingNavigation ? "bg-primary" : "bg-muted"}`}
        >
          <Text
            style={{
              color: primaryTextColor,
              fontWeight: "600",
              textAlign: "center",
              fontSize: 16,
            }}
          >
            {selectedBook
              ? `Go to ${selectedBook.long_name} ${selectedChapter}`
              : "Select a book to continue"}
          </Text>
          <Text
            style={{
              color: primaryTextColor + "80",
              fontSize: 12,
              textAlign: "center",
              marginTop: 4,
            }}
          >
            Navigate to chapter {selectedChapter}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  </Modal>
);
