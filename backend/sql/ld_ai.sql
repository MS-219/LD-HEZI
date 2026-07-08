/*
 Navicat Premium Data Transfer
 Source Server         : Localhost
 Source Database       : juxinsuanli

 Target Server Type    : MySQL
 Target Server Version : 8.0
 File Encoding         : 65001

 Date: 12/12/2025 20:35:00
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 1. Create Database if not exists
-- ----------------------------
CREATE DATABASE IF NOT EXISTS `juxinsuanli` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `juxinsuanli`;

-- ----------------------------
-- 2. Table structure for sys_user (Admin Users)
-- ----------------------------
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '用户名',
  `password` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '密码',
  `nickname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '昵称',
  `create_time` datetime(0) NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_username`(`username`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '后台管理员表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of sys_user
-- ----------------------------
INSERT INTO `sys_user` VALUES (1, 'admin', '123456', 'Super Admin', '2025-12-12 20:00:00');

-- ----------------------------
-- 3. Table structure for app_user (Mini-program Users)
-- ----------------------------
DROP TABLE IF EXISTS `app_user`;
CREATE TABLE `app_user`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `openid` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '微信OpenID',
  `nickname` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `avatar_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `balance` decimal(10, 2) NULL DEFAULT 0.00 COMMENT '余额',
  `create_time` datetime(0) NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_openid`(`openid`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '小程序用户表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of app_user (Test User)
-- ----------------------------
INSERT INTO `app_user` VALUES (1, 'test_openid_123456', 'Test User', '', 0.00, '2025-12-12 20:00:00');

-- ----------------------------
-- 4. Table structure for device
-- ----------------------------
DROP TABLE IF EXISTS `device`;
CREATE TABLE `device`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `sn` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '设备SN码',
  `business_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '业务号',
  `user_id` bigint(20) NULL DEFAULT NULL COMMENT '绑定用户ID',
  `status` tinyint(2) NULL DEFAULT 0 COMMENT '0:离线 1:在线',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '设备备注名',
  `location` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '未知位置' COMMENT '地理位置',
  `carrier` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '运营商',
  `hashrate` int(11) NULL DEFAULT 0 COMMENT '算力值',
  `last_heartbeat_time` datetime(0) NULL DEFAULT NULL COMMENT '最后心跳时间',
  `last_pay_time` datetime(0) NULL DEFAULT NULL COMMENT '上次结算时间',
  `bind_time` datetime(0) NULL DEFAULT NULL COMMENT '绑定时间',
  `create_time` datetime(0) NULL DEFAULT CURRENT_TIMESTAMP COMMENT '首次注册时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_sn`(`sn`) USING BTREE,
  INDEX `idx_user_id`(`user_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '设备表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- 5. Table structure for device_earnings
-- ----------------------------
DROP TABLE IF EXISTS `device_earnings`;
CREATE TABLE `device_earnings`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `device_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `amount` decimal(10, 2) NOT NULL COMMENT '收益金额',
  `date` date NOT NULL COMMENT '收益日期',
  `create_time` datetime(0) NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_device_date`(`device_id`, `date`) USING BTREE,
  INDEX `idx_user_date_amount`(`user_id`, `date`, `amount`) USING BTREE,
  INDEX `idx_device_date_amount`(`device_id`, `date`, `amount`) USING BTREE,
  INDEX `idx_date_amount`(`date`, `amount`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '设备收益记录' ROW_FORMAT = Dynamic;

-- ----------------------------
-- 6. Table structure for notice (系统公告)
-- ----------------------------
DROP TABLE IF EXISTS `notice`;
CREATE TABLE `notice`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '公告标题',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '公告内容',
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '封面图片',
  `type` tinyint(2) NULL DEFAULT 1 COMMENT '类型: 1-系统通知 2-活动公告 3-维护公告',
  `status` tinyint(2) NULL DEFAULT 0 COMMENT '状态: 0-草稿 1-已发布',
  `sort` int(11) NULL DEFAULT 0 COMMENT '排序权重',
  `publish_time` datetime(0) NULL DEFAULT NULL COMMENT '发布时间',
  `create_time` datetime(0) NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_status`(`status`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '系统公告表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of notice (示例数据)
-- ----------------------------
INSERT INTO `notice` VALUES (1, '小程序迁移通知', '如有企业用户或特殊权限用户，请提前与您的专属客户经理沟通，我们将提供一对一协助。', NULL, 1, 1, 10, '2025-12-01 10:00:00', '2025-12-01 10:00:00', '2025-12-01 10:00:00');
INSERT INTO `notice` VALUES (2, '全球云智算今日上线！', '全新版本，算力更强，收益更高。欢迎体验！', NULL, 2, 1, 5, '2025-12-10 09:00:00', '2025-12-10 09:00:00', '2025-12-10 09:00:00');

-- ----------------------------
-- 7. Table structure for withdraw (提现记录)
-- ----------------------------
DROP TABLE IF EXISTS `withdraw`;
CREATE TABLE `withdraw`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL COMMENT '用户ID',
  `amount` decimal(10, 2) NOT NULL COMMENT '提现金额',
  `fee` decimal(10, 2) NULL DEFAULT 0.00 COMMENT '手续费',
  `actual_amount` decimal(10, 2) NOT NULL COMMENT '实际到账金额',
  `type` tinyint(2) NULL DEFAULT 1 COMMENT '提现方式: 1-微信 2-支付宝 3-银行卡',
  `account` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '收款账号',
  `real_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '收款人姓名',
  `status` tinyint(2) NULL DEFAULT 0 COMMENT '状态: 0-待审核 1-已通过 2-已拒绝 3-已打款',
  `remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `auditor_id` bigint(20) NULL DEFAULT NULL COMMENT '审核人ID',
  `audit_time` datetime(0) NULL DEFAULT NULL COMMENT '审核时间',
  `create_time` datetime(0) NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`user_id`) USING BTREE,
  INDEX `idx_status`(`status`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '提现记录表' ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
