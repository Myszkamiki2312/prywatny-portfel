package pl.prywatnyportfel.mobile.offline

import android.content.Context
import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase

@Entity(tableName = "state_snapshot")
data class StateSnapshotEntity(
    @PrimaryKey val id: Int = 1,
    @ColumnInfo(name = "state_json") val stateJson: String,
    @ColumnInfo(name = "updated_at") val updatedAt: String
)

@Entity(tableName = "quotes")
data class QuoteEntity(
    @PrimaryKey val ticker: String,
    val price: Double,
    val currency: String,
    val provider: String,
    @ColumnInfo(name = "fetched_at") val fetchedAt: String
)

@Entity(tableName = "kv_store")
data class KvEntity(
    @PrimaryKey val key: String,
    val value: String,
    @ColumnInfo(name = "updated_at") val updatedAt: String
)

@Entity(tableName = "error_logs")
data class ErrorLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val source: String,
    val level: String,
    val method: String,
    val path: String,
    val message: String,
    @ColumnInfo(name = "details_json") val detailsJson: String,
    @ColumnInfo(name = "created_at") val createdAt: String
)

@Entity(tableName = "backup_runs")
data class BackupRunEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val status: String,
    val verified: Int,
    @ColumnInfo(name = "summary_json") val summaryJson: String,
    @ColumnInfo(name = "created_at") val createdAt: String
)

@Dao
interface OfflineDao {
    @Query("SELECT * FROM state_snapshot WHERE id = 1")
    suspend fun getStateSnapshot(): StateSnapshotEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertStateSnapshot(entity: StateSnapshotEntity)

    @Query("SELECT * FROM quotes ORDER BY ticker ASC")
    suspend fun listQuotes(): List<QuoteEntity>

    @Query("SELECT * FROM quotes WHERE ticker IN (:tickers)")
    suspend fun listQuotesByTickers(tickers: List<String>): List<QuoteEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertQuotes(rows: List<QuoteEntity>)

    @Query("SELECT * FROM kv_store WHERE `key` = :key LIMIT 1")
    suspend fun getKv(key: String): KvEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertKv(entity: KvEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertErrorLog(entity: ErrorLogEntity)

    @Query("SELECT * FROM error_logs ORDER BY id DESC LIMIT :limit")
    suspend fun listErrorLogs(limit: Int): List<ErrorLogEntity>

    @Query("DELETE FROM error_logs")
    suspend fun clearAllErrorLogs()

    @Query(
        """
        DELETE FROM error_logs
        WHERE id NOT IN (
          SELECT id FROM error_logs ORDER BY id DESC LIMIT :keepLast
        )
        """
    )
    suspend fun clearErrorLogsKeepLast(keepLast: Int)

    @Query("SELECT COUNT(*) FROM error_logs WHERE lower(level) = lower(:level) AND created_at >= :fromIso")
    suspend fun countErrorsSince(level: String, fromIso: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBackupRun(entity: BackupRunEntity)

    @Query("SELECT * FROM backup_runs ORDER BY id DESC LIMIT :limit")
    suspend fun listBackupRuns(limit: Int): List<BackupRunEntity>

    @Query("SELECT * FROM backup_runs ORDER BY id DESC LIMIT 1")
    suspend fun lastBackupRun(): BackupRunEntity?

    @Query(
        """
        DELETE FROM backup_runs
        WHERE id NOT IN (
          SELECT id FROM backup_runs ORDER BY id DESC LIMIT :keepLast
        )
        """
    )
    suspend fun trimBackupRuns(keepLast: Int)
}

@Database(
    entities = [StateSnapshotEntity::class, QuoteEntity::class, KvEntity::class, ErrorLogEntity::class, BackupRunEntity::class],
    version = 1,
    exportSchema = false
)
abstract class OfflineDatabase : RoomDatabase() {
    abstract fun dao(): OfflineDao

    companion object {
        @Volatile
        private var INSTANCE: OfflineDatabase? = null

        fun get(context: Context): OfflineDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE
                    ?: Room.databaseBuilder(
                        context.applicationContext,
                        OfflineDatabase::class.java,
                        "prywatny_portfel_offline.db"
                    ).fallbackToDestructiveMigration().build().also { INSTANCE = it }
            }
        }
    }
}
