package com.ldai.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("app_release")
public class AppRelease {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String platform;
    private String versionName;
    private Integer versionCode;
    private String releaseNotes;
    private String fileName;
    private String filePath;
    private Long fileSize;
    private String sha256;
    private Boolean published;
    private LocalDateTime createTime;
    private LocalDateTime publishedAt;
    private Long createdBy;
}
