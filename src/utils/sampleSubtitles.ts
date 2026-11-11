export const SAMPLE_SRT = `1
00:00:01,200 --> 00:00:04,500
Welcome to this in-depth guide on modern video creation and captioning.

2
00:00:05,100 --> 00:00:08,800
Subtitles dramatically increase viewer retention and comprehension on all platforms.

3
00:00:09,300 --> 00:00:13,400
Whether you upload to YouTube, Vimeo, or educational platforms, clear captions matter.

4
00:00:14,000 --> 00:00:18,200
[music playing]
<i>In this lesson, we will explore SubRip and WebVTT conversion workflows.</i>

5
00:00:18,900 --> 00:00:22,600
Let us examine timestamp precision and audio synchronization techniques.
`;

export const SAMPLE_VTT = `WEBVTT - Demo Captions

00:00:01.200 --> 00:00:04.500 position:10% align:left
Welcome to this in-depth guide on modern video creation and captioning.

00:00:05.100 --> 00:00:08.800
Subtitles dramatically increase viewer retention and comprehension on all platforms.

00:00:09.300 --> 00:00:13.400
Whether you upload to YouTube, Vimeo, or educational platforms, clear captions matter.

00:00:14.000 --> 00:00:18.200
[music playing]
<i>In this lesson, we will explore SubRip and WebVTT conversion workflows.</i>

00:00:18.900 --> 00:00:22.600
Let us examine timestamp precision and audio synchronization techniques.
`;

export const SAMPLE_PROBLEMATIC_SRT = `1
00:00:01,000 --> 00:00:04,000
Welcome to this test subtitle with intentional broadcast errors.

2
00:00:03,500 --> 00:00:07,000
This cue starts before the previous one ends, causing an overlapping collision!

3
00:00:08,000 --> 00:00:08,000
Zero duration flash!

4
00:00:09,000 --> 00:00:10,200
This cue has an excessively high reading speed of sixty-two characters in slightly over one single second which makes it impossible to read comfortably.

5
00:00:11,000 --> 00:00:14,000
<i>This cue has an unclosed italic tag that breaks styling.

6
00:00:15,000 --> 00:00:18,500
Line one of text.
Line two of text.
Line three of text which exceeds broadcast maximum line count.
`;
