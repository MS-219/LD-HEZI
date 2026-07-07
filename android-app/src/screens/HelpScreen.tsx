/**
 * 帮助中心（对应 pages/help）：常见问题折叠列表 + 联系客服。
 * 去掉了 AI 创作相关的 FAQ 条目。
 */
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { request } from '../api';
import { Button, Card, NavBar } from '../components/common';
import { colors } from '../theme';

const defaultFaqs = [
  {
    id: 1,
    question: '如何绑定设备？',
    answer: '进入"设备"页面，点击"添加"按钮，输入设备上的绑定码即可绑定。',
  },
  {
    id: 2,
    question: '收益是如何计算的？',
    answer: '设备在线期间，每小时自动结算一次收益。收益金额根据设备算力和当前收益率计算。',
  },
  {
    id: 3,
    question: '如何提现？',
    answer: '进入"我的"页面，点击"申请提现"，输入提现金额后提交申请。提现将在1-3个工作日内到账。',
  },
  {
    id: 4,
    question: '最低提现金额是多少？',
    answer: '最低提现金额以页面配置为准。提现申请提交后由平台审核并安排打款。',
  },
  {
    id: 5,
    question: '设备离线会影响收益吗？',
    answer: '是的，设备离线期间不产生收益。请确保设备保持在线状态以获得持续收益。',
  },
];

export default function HelpScreen() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [contact, setContact] = useState({ wechat: 'juxinsuanli', workTime: '9:00-18:00' });

  useEffect(() => {
    (async () => {
      try {
        const res = await request<any>({ url: '/api/settings/system-config' });
        if (res.code === 200 && res.data) {
          setContact({
            wechat: res.data.contactWechat || 'juxinsuanli',
            workTime: res.data.contactWorkTime || '9:00-18:00',
          });
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const contactService = () => {
    Alert.alert('联系客服', `客服微信：${contact.wechat}\n工作时间：${contact.workTime}`);
  };

  return (
    <View style={styles.page}>
      <NavBar title="帮助中心" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>常见问题</Text>
        {defaultFaqs.map((faq) => {
          const expanded = expandedId === faq.id;
          return (
            <Card key={faq.id} onPress={() => setExpandedId(expanded ? null : faq.id)}>
              <View style={styles.questionRow}>
                <Text style={styles.question}>{faq.question}</Text>
                <Text style={styles.arrow}>{expanded ? '︿' : '﹀'}</Text>
              </View>
              {expanded && <Text style={styles.answer}>{faq.answer}</Text>}
            </Card>
          );
        })}
        <Button title="联系客服" type="secondary" onPress={contactService} style={{ marginTop: 8 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  header: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 10 },
  questionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  question: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1, marginRight: 10 },
  arrow: { color: colors.muted, fontSize: 12 },
  answer: { color: colors.textSecondary, marginTop: 10, lineHeight: 20, fontSize: 13 },
});
